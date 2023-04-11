package io.jenkins.plugins.dapps;

import com.cloudbees.plugins.credentials.CredentialsMatchers;
import com.cloudbees.plugins.credentials.CredentialsProvider;
import com.cloudbees.plugins.credentials.common.StandardListBoxModel;
import de.tu_berlin.sbe.DevOpsRegistry;
import hudson.EnvVars;
import hudson.Extension;
import hudson.FilePath;
import hudson.Launcher;
import hudson.model.AbstractProject;
import hudson.model.Item;
import hudson.model.Run;
import hudson.model.TaskListener;
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
import java.util.Collections;

public class DappVoterBuilder extends Builder implements SimpleBuildStep {
    private String credentialsId;
    private String operationType;
    private boolean accept;
    private String contractAddress;

    @DataBoundConstructor
    public DappVoterBuilder(String credentialsId, String operationType, boolean accept, String contractAddress) {
        this.credentialsId = credentialsId;
        this.operationType = operationType;
        this.accept = accept;
        this.contractAddress = contractAddress;

        EthereumPrivateKey ethereumPrivateKey = CredentialsMatchers.firstOrNull(
                CredentialsProvider.lookupCredentials(
                        EthereumPrivateKey.class,
                        Jenkins.get(),
                        ACL.SYSTEM
                ), CredentialsMatchers.withId(credentialsId));
        if (ethereumPrivateKey == null) {
            throw new RuntimeException("Credentials not found");
        }
    }

    public String getOperationType() {
        return operationType;
    }

    public boolean isAccept() {
        return accept;
    }

    public boolean getAccept() {
        return accept;
    }

    public String getCredentialsId() {
        return credentialsId;
    }

    public String getContractAddress() {
        return contractAddress;
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

        if (operationType.equals("versionProposal")) {
            listener.getLogger().println("Getting given commit hash from environment");
            String gitCommitHash = env.get("GIVEN_GIT_COMMIT");
            listener.getLogger().println("Git commit hash: " + gitCommitHash);
            byte[] gitCommitHashBytes;
            try {
                gitCommitHashBytes = Hex.decodeHex(gitCommitHash);
            } catch (DecoderException e) {
                throw new RuntimeException(e);
            }

            try {
                devOpsRegistry.voteVersionProposal(gitCommitHashBytes, accept).send();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } else if (operationType.equals("deploymentProposal")) {
            listener.getLogger().println("Getting givencontract address from environment");
            String contractAddress = env.get("GIVEN_CONTRACT_ADDRESS");
            listener.getLogger().println("Contract address: " + contractAddress);

            try {
                devOpsRegistry.voteDeploymentProposal(contractAddress, accept).send();
            } catch (Exception e) {
                throw new RuntimeException(e);
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

        public FormValidation doCheckContractAddress(@QueryParameter String value) throws IOException, ServletException {
            if (!WalletUtils.isValidAddress(value)) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidAddress());
            }

            return FormValidation.ok();
        }

        @Override
        public boolean isApplicable(Class<? extends AbstractProject> aClass) {
            return true;
        }

        @Override
        public String getDisplayName() {
            return Messages.DappVoterBuilder_DescriptorImpl_DisplayName();
        }
    }
}
