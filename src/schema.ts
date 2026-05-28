import { z } from "zod";

const bannerStyleSchema = z.enum(["html-comment-top", "html-comment-after-frontmatter"]);

export const policiesConfigSchema = z
  .object({
    version: z.number().int().positive(),
    banners: z.object({
      generated: z.string().min(1),
      policySource: z.string().min(1),
    }),
    slots: z.record(
      z.string().min(1),
      z
        .object({
          supportedBy: z.array(z.string().min(1)).min(1),
        })
        .strict(),
    ),
    targets: z.record(
      z.string().min(1),
      z
        .object({
          kind: z.string().min(1),
          fileExtension: z.string().min(1),
          bannerStyle: bannerStyleSchema,
        })
        .strict(),
    ),
    validation: z
      .object({
        requireFrontmatter: z.boolean(),
        requireUniqueIds: z.enum(["per-module"]),
        forbidUnknownFrontmatterFields: z.boolean(),
        failOnEmptyTargetSet: z.boolean(),
        failOnUnknownSlot: z.boolean(),
        failOnUnknownTarget: z.boolean(),
        failOnRequiresCycle: z.boolean(),
      })
      .strict(),
    compose: z
      .object({
        alwaysInclude: z.array(z.string().min(1)),
        globalSlotInjection: z.record(z.string().min(1), z.enum(["first"])),
      })
      .strict(),
  })
  .strict();

export const includeSchema = z
  .object({
    module: z.string().min(1),
    slot: z.string().min(1).optional(),
    as: z.string().min(1).optional(),
  })
  .strict();

export const outputSchema = z
  .object({
    target: z.string().min(1),
    out: z.string().min(1),
    title: z.string().min(1).optional(),
    emitTitle: z.boolean().optional(),
    frontmatter: z.record(z.string().min(1), z.unknown()).optional(),
    include: z.array(includeSchema).min(1).optional(),
  })
  .strict();

export const policyModuleSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    fragmentDiscovery: z.enum(["implicit-siblings"]).default("implicit-siblings"),
    ignore: z.array(z.string().min(1)).default([]),
    outputs: z.array(outputSchema).min(1),
    defaults: z
      .object({
        targets: z.array(z.string().min(1)).min(1).optional(),
        slot: z.string().min(1).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

const renderOverrideValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const fragmentFrontmatterSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    slot: z.string().min(1),
    order: z.number().int(),
    targets: z.array(z.string().min(1)).min(1).optional(),
    kind: z.enum(["policy", "governance", "commands", "notes"]).optional(),
    summary: z.string().min(1).optional(),
    requires: z.array(z.string().min(1)).default([]),
    enabled: z.boolean().default(true),
    render: z.record(z.string().min(1), z.record(z.string().min(1), renderOverrideValueSchema)).optional(),
  })
  .strict();

export type PoliciesConfig = z.infer<typeof policiesConfigSchema>;
export type PolicyModuleConfig = z.infer<typeof policyModuleSchema>;
export type IncludeConfig = z.infer<typeof includeSchema>;
export type OutputConfig = z.infer<typeof outputSchema>;
export type FragmentFrontmatter = z.infer<typeof fragmentFrontmatterSchema>;
export type BannerStyle = z.infer<typeof bannerStyleSchema>;
