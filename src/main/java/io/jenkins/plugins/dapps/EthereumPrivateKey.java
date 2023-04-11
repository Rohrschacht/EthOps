package io.jenkins.plugins.dapps;

import com.cloudbees.plugins.credentials.common.StandardCredentials;
import hudson.util.Secret;

import java.io.IOException;

public interface EthereumPrivateKey extends StandardCredentials {
    Secret getPrivateKey() throws IOException, InterruptedException;
}
