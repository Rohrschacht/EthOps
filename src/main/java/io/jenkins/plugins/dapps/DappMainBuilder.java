package io.jenkins.plugins.dapps;

import com.cloudbees.plugins.credentials.CredentialsMatchers;
import com.cloudbees.plugins.credentials.CredentialsProvider;
import com.cloudbees.plugins.credentials.common.StandardListBoxModel;
import de.tu_berlin.sbe.DevOpsRegistry;
import hudson.EnvVars;
import hudson.Extension;
import hudson.FilePath;
import hudson.Launcher;
import hudson.model.*;
import hudson.security.ACL;
import hudson.tasks.BuildStepDescriptor;
import hudson.tasks.Builder;
import hudson.util.FormValidation;
import hudson.util.ListBoxModel;
import jenkins.model.Jenkins;
import jenkins.tasks.SimpleBuildStep;
import net.sf.json.JSONObject;
import org.apache.commons.codec.DecoderException;
import org.apache.commons.codec.binary.Hex;
import org.jenkinsci.Symbol;
import org.jetbrains.annotations.NotNull;
import org.kohsuke.stapler.AncestorInPath;
import org.kohsuke.stapler.DataBoundConstructor;
import org.kohsuke.stapler.QueryParameter;
import org.kohsuke.stapler.StaplerRequest;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.WalletUtils;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.DefaultGasProvider;

import javax.servlet.ServletException;
import java.io.IOException;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.List;

public class DappMainBuilder extends Builder implements SimpleBuildStep {
    private String credentialsId;
    private String operationType;
    private String contractAddress;
    private String webhookTargets;

    @DataBoundConstructor
    public DappMainBuilder(String credentialsId, String operationType, String contractType, String initialVoters, long initialVersionQuorum, long initialRoleBindingQuorum, String contractAddress, String webhookTargets) {
        this.credentialsId = credentialsId;
        this.operationType = operationType;
        this.webhookTargets = webhookTargets;

        String nodeUrl = NodeConfiguration.get().getNodeUrl();

        EthereumPrivateKey ethereumPrivateKey = CredentialsMatchers.firstOrNull(
                CredentialsProvider.lookupCredentials(
                        EthereumPrivateKey.class,
                        Jenkins.get(),
                        ACL.SYSTEM
                ), CredentialsMatchers.withId(credentialsId));
        if (ethereumPrivateKey == null) {
            throw new RuntimeException("Credentials not found");
        }

        Credentials credentials = null;
        try {
            String privateKey = ethereumPrivateKey.getPrivateKey().getPlainText();
            credentials = Credentials.create(privateKey);
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException(e);
        }

        Web3j web3 = Web3j.build(new HttpService(nodeUrl));

        if (contractType.equals("bootstrap")) {
            List<String> initialVotersList = List.of(initialVoters.split("\\s*,\\s*"));
            BigInteger initialVersionQuorumBigInt = BigInteger.valueOf(initialVersionQuorum);
            BigInteger initialRoleBindingQuorumBigInt = BigInteger.valueOf(initialRoleBindingQuorum);
            ContractGasProvider gasProvider = new DefaultGasProvider();

            try {
                DevOpsRegistry devOpsRegistry = DevOpsRegistry.deploy(web3, credentials, gasProvider, initialVotersList, initialVersionQuorumBigInt, initialRoleBindingQuorumBigInt).send();
                String devOpsRegistryAddress = devOpsRegistry.getContractAddress();
                this.contractAddress = devOpsRegistryAddress;
                ((DappMainBuilder.DescriptorImpl) getDescriptor()).setDevOpsRegistryAddress(devOpsRegistryAddress);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } else if (contractType.equals("fromAddress")) {
            this.contractAddress = contractAddress;
            ((DappMainBuilder.DescriptorImpl) getDescriptor()).setDevOpsRegistryAddress(contractAddress);
        } else if (contractType.equals("fromPrevious")) {
            this.contractAddress = ((DappMainBuilder.DescriptorImpl) getDescriptor()).getDevOpsRegistryAddress();
        }
    }

    public String getContractType() {
        return "fromAddress";
    }

    public String getCredentialsId() {
        return credentialsId;
    }

    public String getOperationType() {
        return operationType;
    }

    public String getContractAddress() {
        return contractAddress;
    }

    public String getWebhookTargets() {
        return webhookTargets;
    }

    @Override
    public void perform(@NotNull Run<?, ?> run, @NotNull FilePath workspace, EnvVars env, @NotNull Launcher launcher, TaskListener listener) throws InterruptedException, IOException {
        String nodeUrl = NodeConfiguration.get().getNodeUrl();
        String devOpsRegistryAddress = getContractAddress();

        EthereumPrivateKey ethereumPrivateKey = CredentialsMatchers.firstOrNull(
                CredentialsProvider.lookupCredentials(
                        EthereumPrivateKey.class,
                        Jenkins.get(),
                        ACL.SYSTEM
                ), CredentialsMatchers.withId(credentialsId));
        if (ethereumPrivateKey == null) {
            throw new RuntimeException("Credentials not found");
        }

        Credentials credentials = null;
        try {
            String privateKey = ethereumPrivateKey.getPrivateKey().getPlainText();
            credentials = Credentials.create(privateKey);
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException(e);
        }

        Web3j web3 = Web3j.build(new HttpService(nodeUrl));
        ContractGasProvider contractGasProvider = new DefaultGasProvider();
        DevOpsRegistry devOpsRegistry = DevOpsRegistry.load(devOpsRegistryAddress, web3, credentials, contractGasProvider);

        listener.getLogger().println("Getting commit hash from environment");
        String gitCommitHash = env.get("GIT_COMMIT");
        listener.getLogger().println("Git commit hash: " + gitCommitHash);

        if (operationType.equals("versionProposal")) {
            byte[] gitCommitHashBytes;
            try {
                gitCommitHashBytes = Hex.decodeHex(gitCommitHash);
            } catch (DecoderException e) {
                throw new RuntimeException(e);
            }

            try {
                devOpsRegistry.createVersionProposal(gitCommitHashBytes).send();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }

            List<String> webhookTargetList = List.of(webhookTargets.split("\\s*,\\s*"));
            for (String webhookTarget : webhookTargetList) {
                String urlWithParameters = String.format("%s?token=%s&GIVEN_GIT_COMMIT=%s&VOTING_TYPE=version", webhookTarget, getContractAddress(), gitCommitHash);
                listener.getLogger().println("Calling webhook URL: " + urlWithParameters);
                URL url = new URL(urlWithParameters);
                HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
                urlConnection.setRequestMethod("GET");
                urlConnection.connect();
                listener.getLogger().println(urlConnection.getResponseMessage());
                urlConnection.disconnect();
            }

            while (true) {
                Thread.sleep(60 * 1000);
                listener.getLogger().println("Checking if VersionProposal is accepted or rejected");
                boolean accepted = false;
                try {
                    accepted = devOpsRegistry.versionProposalAccepted(gitCommitHashBytes).send();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
                if (accepted) {
                    return;
                } else {
                    boolean rejected = false;
                    try {
                        rejected = devOpsRegistry.versionProposalRejected(gitCommitHashBytes).send();
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                    if (rejected) {
                        run.setResult(Result.FAILURE);
                        throw new InterruptedException("VersionProposal was rejected");
                    }
                }
            }
        } else if (operationType.equals("deploymentProposal")) {
            listener.getLogger().println("Getting newly deployed contract address from environment");
            String contractAddress = env.get("CONTRACT_ADDRESS");
            listener.getLogger().println("Contract address: " + contractAddress);

            try {
                devOpsRegistry.createDeploymentProposal(contractAddress).send();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }

            List<String> webhookTargetList = List.of(webhookTargets.split("\\s*,\\s*"));
            for (String webhookTarget : webhookTargetList) {
                String urlWithParameters = String.format("%s?token=%s&GIVEN_CONTRACT_ADDRESS=%s&GIVEN_GIT_COMMIT=%s&VOTING_TYPE=deployment", webhookTarget, getContractAddress(), contractAddress, gitCommitHash);
                URL url = new URL(urlWithParameters);
                HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
                urlConnection.connect();
                listener.getLogger().println(urlConnection.getResponseMessage());
                urlConnection.disconnect();
            }
        }
    }

    @Symbol("greet")
    @Extension
    public static final class DescriptorImpl extends BuildStepDescriptor<Builder> {
        private String devOpsRegistryAddress;

        public void setDevOpsRegistryAddress(String devOpsRegistryAddress) {
            this.devOpsRegistryAddress = devOpsRegistryAddress;
        }

        public String getDevOpsRegistryAddress() {
            return devOpsRegistryAddress;
        }

        @Override
        public boolean configure(StaplerRequest req, JSONObject json) throws FormException {
            System.out.println("Executing Descriptor configure");
            System.out.println(json);
            req.bindJSON(this, json);
            return true;
        }

        public ListBoxModel doFillCredentialsIdItems(
                @AncestorInPath Item item,
                @QueryParameter String credentialsId
        ) {
            StandardListBoxModel result = new StandardListBoxModel();
            if (item == null) {
                if (!Jenkins.get().hasPermission(Jenkins.ADMINISTER)) {
                    return result.includeCurrentValue(credentialsId); // (2)
                }
            } else {
                if (!item.hasPermission(Item.EXTENDED_READ)
                        && !item.hasPermission(CredentialsProvider.USE_ITEM)) {
                    return result.includeCurrentValue(credentialsId); // (2)
                }
            }

            return result
                    .includeEmptyValue()
                    .includeMatchingAs(ACL.SYSTEM, Jenkins.get(), EthereumPrivateKey.class, Collections.emptyList(), CredentialsMatchers.instanceOf(EthereumPrivateKey.class))
                    .includeCurrentValue(credentialsId);
        }

        public FormValidation doCheckCredentialsId(
                @AncestorInPath Item item, // (2)
                @QueryParameter String value // (1)
        ) throws IOException, InterruptedException {
            if (item == null) {
                if (!Jenkins.get().hasPermission(Jenkins.ADMINISTER)) {
                    return FormValidation.ok(); // (3)
                }
            } else {
                if (!item.hasPermission(Item.EXTENDED_READ)
                        && !item.hasPermission(CredentialsProvider.USE_ITEM)) {
                    return FormValidation.ok(); // (3)
                }
            }
//            if (value.startsWith("${") && value.endsWith("}")) { // (5)
//                return FormValidation.warning("Cannot validate expression based credentials");
//            }
            ListBoxModel credentialsList = CredentialsProvider.listCredentials(
                    EthereumPrivateKey.class,
                    Jenkins.get(),
                    ACL.SYSTEM,
                    Collections.emptyList(),
                    CredentialsMatchers.withId(value)
            );
            if (credentialsList.isEmpty()) {
                return FormValidation.error("Cannot find currently selected credentials");
            }

            EthereumPrivateKey credentials = CredentialsMatchers.firstOrNull(
                    CredentialsProvider.lookupCredentials(
                            EthereumPrivateKey.class,
                            Jenkins.get(),
                            ACL.SYSTEM
                    ), CredentialsMatchers.withId(value));
            if (credentials == null) {
                return FormValidation.error("Cannot find currently selected credentials");
            }

            String privateKey = credentials.getPrivateKey().getPlainText();
            if (privateKey.length() != 64) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidPrivateKey());
            }

            if (!WalletUtils.isValidPrivateKey(privateKey)) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidPrivateKey());
            }

            try {
                Credentials.create(privateKey);
            } catch (NumberFormatException e) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidPrivateKey());
            }

            return FormValidation.ok();
        }

        public FormValidation doCheckInitialVersionQuorum(@QueryParameter String value) throws IOException, ServletException {
            try {
                int initialQuorum = Integer.parseInt(value);

                if (initialQuorum < 0 || initialQuorum > 100) {
                    return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidInitialQuorum());
                }
            } catch (NumberFormatException e) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidInitialQuorum());
            }

            return FormValidation.ok();
        }

        public FormValidation doCheckInitialRoleBindingQuorum(@QueryParameter String value) throws IOException, ServletException {
            try {
                int initialQuorum = Integer.parseInt(value);

                if (initialQuorum < 0 || initialQuorum > 100) {
                    return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidInitialQuorum());
                }
            } catch (NumberFormatException e) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidInitialQuorum());
            }

            return FormValidation.ok();
        }

        public FormValidation doCheckContractAddress(@QueryParameter String value) throws IOException, ServletException {
            if (!WalletUtils.isValidAddress(value)) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidAddress());
            }

            return FormValidation.ok();
        }

        public FormValidation doCheckInitialVoters(@QueryParameter String value) throws IOException, ServletException {
            List<String> initialVotersList = List.of(value.split("\\s*,\\s*"));
            for (String address : initialVotersList) {
                if (!WalletUtils.isValidAddress(address)) {
                    return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidAddress());
                }
            }

            return FormValidation.ok();
        }

        @Override
        public boolean isApplicable(Class<? extends AbstractProject> aClass) {
            return true;
        }

        @Override
        public String getDisplayName() {
            return Messages.DappMainBuilder_DescriptorImpl_DisplayName();
        }
    }
}
