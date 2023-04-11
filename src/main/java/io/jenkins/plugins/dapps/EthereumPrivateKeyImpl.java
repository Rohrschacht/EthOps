package io.jenkins.plugins.dapps;

import com.cloudbees.plugins.credentials.CredentialsScope;
import com.cloudbees.plugins.credentials.impl.BaseStandardCredentials;
import hudson.Extension;
import hudson.util.FormValidation;
import hudson.util.Secret;
import io.reactivex.annotations.NonNull;
import org.jetbrains.annotations.NotNull;
import org.kohsuke.stapler.DataBoundConstructor;
import org.kohsuke.stapler.QueryParameter;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.WalletUtils;

import javax.annotation.CheckForNull;
import javax.servlet.ServletException;
import java.io.IOException;

public class EthereumPrivateKeyImpl extends BaseStandardCredentials implements EthereumPrivateKey {
    private final Secret privateKey;

    @DataBoundConstructor
    public EthereumPrivateKeyImpl(@CheckForNull CredentialsScope scope, @CheckForNull String id, @NonNull String privateKey, @CheckForNull String description) {
        super(scope, id, description);
        this.privateKey = Secret.fromString(privateKey);
    }

    @NonNull
    @Override
    public Secret getPrivateKey() throws IOException, InterruptedException {
        return privateKey;
    }

    @Extension
    public static class DescriptorImpl extends BaseStandardCredentialsDescriptor {
        @NotNull
        @Override
        public String getDisplayName() {
            return "Ethereum Private Key";
        }

        public FormValidation doCheckPrivateKey(@QueryParameter String value) throws IOException, ServletException {
            if (value.length() != 64) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidPrivateKey());
            }

            if (!WalletUtils.isValidPrivateKey(value)) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidPrivateKey());
            }

            try {
                Credentials.create(value);
            } catch (NumberFormatException e) {
                return FormValidation.error(Messages.DappMainBuilder_DescriptorImpl_errors_invalidPrivateKey());
            }

            return FormValidation.ok();
        }

    }
}
