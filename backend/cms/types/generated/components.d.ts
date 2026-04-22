import type { Schema, Struct } from '@strapi/strapi';

export interface ThemeColors extends Struct.ComponentSchema {
  collectionName: 'components_theme_colors';
  info: {
    description: 'Light and dark mode color tokens';
    displayName: 'Colors';
    icon: 'palette';
  };
  attributes: {
    brand50: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Versi\u00F3n muy clara del color de marca \u2014 fondos hover, highlights suaves';
      }> &
      Schema.Attribute.DefaultTo<'#eff6ff'>;
    brand500: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Color principal de marca \u2014 links, botones activos, \u00EDtem activo en sidebar';
      }> &
      Schema.Attribute.DefaultTo<'#3b82f6'>;
    brand900: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Versi\u00F3n oscura del color de marca \u2014 callouts y acentos en modo oscuro';
      }> &
      Schema.Attribute.DefaultTo<'#1e3a8a'>;
    darkBgPrimary: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo principal de la p\u00E1gina (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#0f172a'>;
    darkBgSecondary: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo de elementos secundarios (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#1e293b'>;
    darkBgSidebar: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo del men\u00FA lateral izquierdo (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#1e293b'>;
    darkBorderColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'L\u00EDneas divisoras y bordes (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#334155'>;
    darkCalloutBg: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo de callouts (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#1e3a8a'>;
    darkCalloutBorder: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Borde izquierdo de callouts (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#60a5fa'>;
    darkCodeBg: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo de bloques de c\u00F3digo (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#1e293b'>;
    darkCodeText: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Color del texto dentro de c\u00F3digo (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#e2e8f0'>;
    darkTextMuted: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Texto tenue: fechas, metadatos (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#475569'>;
    darkTextPrimary: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Color del texto principal de art\u00EDculos (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#f1f5f9'>;
    darkTextSecondary: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Texto secundario (modo oscuro)';
      }> &
      Schema.Attribute.DefaultTo<'#94a3b8'>;
    lightBgPrimary: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo principal de la p\u00E1gina (modo claro). Afecta el \u00E1rea de contenido';
      }> &
      Schema.Attribute.DefaultTo<'#ffffff'>;
    lightBgSecondary: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo de elementos secundarios: tablas, hover states (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#f8fafc'>;
    lightBgSidebar: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo del men\u00FA lateral izquierdo (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#f1f5f9'>;
    lightBorderColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'L\u00EDneas divisoras, bordes de cards y tablas (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#e2e8f0'>;
    lightCalloutBg: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo de notas/callouts informativos (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#eff6ff'>;
    lightCalloutBorder: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Borde izquierdo de callouts \u2014 color de acento visual (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#3b82f6'>;
    lightCodeBg: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Fondo de bloques de c\u00F3digo inline y en bloque (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#f1f5f9'>;
    lightCodeText: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Color del texto dentro de bloques de c\u00F3digo (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#0f172a'>;
    lightTextMuted: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Texto tenue: fechas, metadatos, paginaci\u00F3n (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#94a3b8'>;
    lightTextPrimary: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Color del texto principal de art\u00EDculos (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#0f172a'>;
    lightTextSecondary: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'> &
      Schema.Attribute.SetPluginOptions<{
        description: 'Texto secundario: subt\u00EDtulos, descripciones (modo claro)';
      }> &
      Schema.Attribute.DefaultTo<'#475569'>;
  };
}

export interface ThemeLayout extends Struct.ComponentSchema {
  collectionName: 'components_theme_layout';
  info: {
    description: 'Layout and container settings';
    displayName: 'Layout';
    icon: 'layout';
  };
  attributes: {
    animationEasing: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'cubic-bezier(0.4, 0, 0.2, 1)'>;
    borderRadius: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'0.5rem'>;
    codeBorderRadius: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'0.5rem'>;
    maxContentWidth: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'72rem'>;
    tocWidth: Schema.Attribute.String & Schema.Attribute.DefaultTo<'14rem'>;
    transitionDuration: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'0.2s'>;
  };
}

export interface ThemeSpacing extends Struct.ComponentSchema {
  collectionName: 'components_theme_spacing';
  info: {
    description: 'Global spacing tokens (padding, margins, gaps)';
    displayName: 'Spacing';
    icon: 'expand';
  };
  attributes: {
    contentPaddingX: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1.5rem'>;
    contentPaddingY: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'2rem'>;
    headerHeight: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'3.5rem'>;
    sectionGap: Schema.Attribute.String & Schema.Attribute.DefaultTo<'2rem'>;
    sidebarWidth: Schema.Attribute.String & Schema.Attribute.DefaultTo<'16rem'>;
  };
}

export interface ThemeTypography extends Struct.ComponentSchema {
  collectionName: 'components_theme_typography';
  info: {
    description: 'Global typography settings (fonts, sizes, line heights)';
    displayName: 'Typography';
    icon: 'text';
  };
  attributes: {
    baseFontSize: Schema.Attribute.String & Schema.Attribute.DefaultTo<'16px'>;
    baseLineHeight: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1.625'>;
    fontMono: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'JetBrains Mono'>;
    fontSans: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Inter'>;
    headingLineHeight: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1.25'>;
    headingSpacingBottom: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'0.75rem'>;
    headingSpacingTop: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'2rem'>;
    listSpacing: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'0.375rem'>;
    paragraphSpacing: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1rem'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'theme.colors': ThemeColors;
      'theme.layout': ThemeLayout;
      'theme.spacing': ThemeSpacing;
      'theme.typography': ThemeTypography;
    }
  }
}
