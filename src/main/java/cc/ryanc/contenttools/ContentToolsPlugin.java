package cc.ryanc.contenttools;

import cc.ryanc.contenttools.extension.ContentSnippet;
import org.springframework.stereotype.Component;
import run.halo.app.extension.Scheme;
import run.halo.app.extension.SchemeManager;
import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;

/**
 * @author ryanwang
 */
@Component
public class ContentToolsPlugin extends BasePlugin {

    private final SchemeManager schemeManager;

    public ContentToolsPlugin(PluginContext pluginContext, SchemeManager schemeManager) {
        super(pluginContext);
        this.schemeManager = schemeManager;
    }

    @Override
    public void start() {
        schemeManager.register(ContentSnippet.class);
    }

    @Override
    public void stop() {
        schemeManager.unregister(Scheme.buildFromType(ContentSnippet.class));
    }
}
