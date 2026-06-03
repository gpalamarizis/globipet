import { type ConfigPlugin } from "@expo/config-plugins";
type ParentTheme = "Default" | "Material2" | "Material3" | "Material3.Dynamic" | "Material3Expressive" | "Material3Expressive.Dynamic" | "Light" | "Material2.Light" | "Material3.Light" | "Material3.Dynamic.Light" | "Material3Expressive.Light" | "Material3Expressive.Dynamic.Light";
type EdgeToEdgePluginConfig = {
    android?: {
        /**
         * Enforce a contrasting background on the navigation bar.
         * Set to `false` to enforce full transparency in all cases (you will then
         * need to manage the navigation bar style using `SystemBars`).
         * @default true
         */
        enforceNavigationBarContrast?: boolean;
        /**
         * The parent theme for the Android `AppTheme`. Choose based on your
         * current theme.
         * @default "Default"
         */
        parentTheme?: ParentTheme;
    };
};
declare const PACKAGE_NAME = "react-native-edge-to-edge";
export declare const withEdgeToEdge: ConfigPlugin<EdgeToEdgePluginConfig | undefined>;
declare const _default: (config: EdgeToEdgePluginConfig) => [typeof PACKAGE_NAME, EdgeToEdgePluginConfig];
export default _default;
//# sourceMappingURL=expo.d.ts.map