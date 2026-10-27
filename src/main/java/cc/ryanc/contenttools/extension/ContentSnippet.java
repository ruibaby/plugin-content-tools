package cc.ryanc.contenttools.extension;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import run.halo.app.extension.AbstractExtension;
import run.halo.app.extension.GVK;

/**
 * A reusable piece of rich text content.
 *
 * @author ryanwang
 */
@Data
@EqualsAndHashCode(callSuper = true)
@GVK(group = "content-tools.halo.run",
    version = "v1alpha1",
    kind = "ContentSnippet",
    plural = "contentsnippets",
    singular = "contentsnippet")
public class ContentSnippet extends AbstractExtension {

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
    private Spec spec;

    @Data
    @Schema(name = "ContentSnippetSpec")
    public static class Spec {

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = 100)
        private String displayName;

        @Schema(maxLength = 500)
        private String description;

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        private String content;
    }
}
