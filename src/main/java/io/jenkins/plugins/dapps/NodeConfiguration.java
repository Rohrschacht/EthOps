package io.jenkins.plugins.dapps;

import hudson.Extension;
import hudson.ExtensionList;
import hudson.util.FormValidation;
import jenkins.model.GlobalConfiguration;
import org.kohsuke.stapler.DataBoundSetter;
import org.kohsuke.stapler.QueryParameter;

import javax.servlet.ServletException;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * Jenkins global configuration for the Ethereum node URL.
 */
@Extension
public class NodeConfiguration extends GlobalConfiguration {

    /**
     * @return the singleton instance
     */
    public static NodeConfiguration get() {
        return ExtensionList.lookupSingleton(NodeConfiguration.class);
    }

    private String nodeUrl = "http://127.0.0.1:8545";

    public NodeConfiguration() {
        // When Jenkins is restarted, load any saved configuration from disk.
        load();
    }

    /**
     * @return the currently configured nodeUrl, if any
     */
    public String getNodeUrl() {
        return nodeUrl;
    }

    /**
     * Together with {@link #getNodeUrl}, binds to entry in {@code config.jelly}.
     *
     * @param nodeUrl the new address of the node
     */
    @DataBoundSetter
    public void setNodeUrl(String nodeUrl) {
        this.nodeUrl = nodeUrl;
        save();
    }

    public FormValidation doCheckNodeUrl(@QueryParameter String value) throws IOException, ServletException {
        try {
            new URL(value);
        } catch (MalformedURLException e) {
            return FormValidation.error(Messages.NodeConfiguration_DescriptorImpl_errors_invalidNodeUrl());
        }

        return FormValidation.ok();
    }
}
