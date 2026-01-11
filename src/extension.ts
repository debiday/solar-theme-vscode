import * as vscode from 'vscode';
import * as https from 'https';
import SunCalc = require('suncalc');
import { SettingsPanel } from './settingsPanel';

interface SolarConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  updateIntervalSeconds: number;
  showNotifications: boolean;
  intensity: number; // 0-100, how intense the color changes are
}

interface ColorPalette {
  // Editor colors
  editorBackground: string;
  editorForeground: string;
  sidebarBackground: string;
  sidebarForeground: string;
  activityBarBackground: string;
  statusBarBackground: string;
  titleBarBackground: string;
  tabBackground: string;
  tabActiveBackground: string;
  // Accent colors
  accentColor: string;
  accentForeground: string;
  // Terminal
  terminalBackground: string;
  // Borders
  borderColor: string;
}

// Sophisticated dark palette with subtle temperature shifts + depth gradient
// All dark mode - warm tones for dawn/dusk, cool for night, neutral for midday
// Pseudo-gradient: Activity Bar (darkest) → Sidebar → Editor → Panel (subtle variation)
const ACCENT_COLOR = '#525866'; // Muted slate accent
const ACCENT_FOREGROUND = '#e4e4e7';

// Consistent foreground colors - don't shift with time (improved contrast)
const EDITOR_FG = '#d0d5dd';  // Brighter for better readability
const SIDEBAR_FG = '#b8c0c8'; // Brighter sidebar text

const PALETTES: Record<string, ColorPalette> = {
  // Night - clean slate blue, like a clear starry sky
  night: {
    editorBackground: '#1a1d24',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#14171d',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#0f1115',
    statusBarBackground: '#0f1115',
    titleBarBackground: '#0f1115',
    tabBackground: '#14171d',
    tabActiveBackground: '#1a1d24',
    accentColor: '#4a5568',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#171a20',
    borderColor: '#2d3748',
  },
  // Pre-dawn - soft lavender undertone
  preDawn: {
    editorBackground: '#1c1a24',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#16141d',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#111015',
    statusBarBackground: '#111015',
    titleBarBackground: '#111015',
    tabBackground: '#16141d',
    tabActiveBackground: '#1c1a24',
    accentColor: '#5a5170',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#191720',
    borderColor: '#332d45',
  },
  // Dawn - soft peach warmth
  dawn: {
    editorBackground: '#211e1a',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#1a1814',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#14120f',
    statusBarBackground: '#14120f',
    titleBarBackground: '#14120f',
    tabBackground: '#1a1814',
    tabActiveBackground: '#211e1a',
    accentColor: '#8b7355',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#1e1b17',
    borderColor: '#3d3530',
  },
  // Sunrise - golden cream
  sunrise: {
    editorBackground: '#232019',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#1c1a14',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#16140f',
    statusBarBackground: '#16140f',
    titleBarBackground: '#16140f',
    tabBackground: '#1c1a14',
    tabActiveBackground: '#232019',
    accentColor: '#9a8560',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#201d16',
    borderColor: '#45402f',
  },
  // Morning - warm neutral
  morning: {
    editorBackground: '#201f1c',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#1a1917',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#141311',
    statusBarBackground: '#141311',
    titleBarBackground: '#141311',
    tabBackground: '#1a1917',
    tabActiveBackground: '#201f1c',
    accentColor: '#6b6560',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#1d1c19',
    borderColor: '#383530',
  },
  // Midday - pure neutral
  midday: {
    editorBackground: '#1e1e1e',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#181818',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#121212',
    statusBarBackground: '#121212',
    titleBarBackground: '#121212',
    tabBackground: '#181818',
    tabActiveBackground: '#1e1e1e',
    accentColor: '#606060',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#1b1b1b',
    borderColor: '#333333',
  },
  // Afternoon - cool steel
  afternoon: {
    editorBackground: '#1b1d20',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#15171a',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#101214',
    statusBarBackground: '#101214',
    titleBarBackground: '#101214',
    tabBackground: '#15171a',
    tabActiveBackground: '#1b1d20',
    accentColor: '#556070',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#181a1d',
    borderColor: '#2a3040',
  },
  // Golden hour - warm amber glow
  goldenHour: {
    editorBackground: '#241f18',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#1d1913',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#17140e',
    statusBarBackground: '#17140e',
    titleBarBackground: '#17140e',
    tabBackground: '#1d1913',
    tabActiveBackground: '#241f18',
    accentColor: '#a08050',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#211c15',
    borderColor: '#4a4030',
  },
  // Sunset - soft coral rose
  sunset: {
    editorBackground: '#221a1e',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#1b1418',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#150f12',
    statusBarBackground: '#150f12',
    titleBarBackground: '#150f12',
    tabBackground: '#1b1418',
    tabActiveBackground: '#221a1e',
    accentColor: '#8a6070',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#1f171b',
    borderColor: '#402a35',
  },
  // Dusk - soft violet
  dusk: {
    editorBackground: '#1e1a24',
    editorForeground: EDITOR_FG,
    sidebarBackground: '#17141d',
    sidebarForeground: SIDEBAR_FG,
    activityBarBackground: '#120f16',
    statusBarBackground: '#120f16',
    titleBarBackground: '#120f16',
    tabBackground: '#17141d',
    tabActiveBackground: '#1e1a24',
    accentColor: '#705880',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#1b1720',
    borderColor: '#352845',
  },
};

// Time phases throughout the day (in hours from midnight)
const TIME_PHASES = [
  { time: 0, palette: 'night' },      // Midnight
  { time: 4, palette: 'night' },      // Late night
  { time: 5, palette: 'preDawn' },    // Pre-dawn
  { time: 6, palette: 'dawn' },       // Dawn
  { time: 6.5, palette: 'sunrise' },  // Sunrise
  { time: 8, palette: 'morning' },    // Morning
  { time: 11, palette: 'midday' },    // Late morning
  { time: 13, palette: 'midday' },    // Early afternoon
  { time: 15, palette: 'afternoon' }, // Afternoon
  { time: 17, palette: 'goldenHour' },// Golden hour
  { time: 18, palette: 'sunset' },    // Sunset
  { time: 19, palette: 'dusk' },      // Dusk
  { time: 20, palette: 'night' },     // Evening
  { time: 24, palette: 'night' },     // End of day
];

let updateInterval: NodeJS.Timeout | undefined;
let statusBarItem: vscode.StatusBarItem;
let isPreviewing = false;
let previewTimeout: NodeJS.Timeout | undefined;
let lastAppliedColors: string = '';  // Hash of last applied colors to avoid unnecessary updates
let updateErrorCount = 0;  // Track consecutive errors to avoid spam

// Auto-detect location using IP geolocation
async function autoDetectLocation(): Promise<{ latitude: number; longitude: number; city: string } | null> {
  return new Promise((resolve) => {
    const req = https.get('https://ipapi.co/json/', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.latitude && json.longitude) {
            resolve({
              latitude: json.latitude,
              longitude: json.longitude,
              city: json.city || 'Unknown',
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Check if this is first run and auto-detect location
async function initializeLocation(context: vscode.ExtensionContext): Promise<void> {
  const hasInitialized = context.globalState.get('solarTheme.locationInitialized');
  
  if (!hasInitialized) {
    const config = vscode.workspace.getConfiguration('solarTheme');
    
    // Only auto-detect if user hasn't manually set location
    const currentLat = config.get<number>('latitude');
    const currentLon = config.get<number>('longitude');
    const isDefaultLat = currentLat === 30.35 || currentLat === 40.7128;
    const isDefaultLon = currentLon === -97.74 || currentLon === -74.006;
    
    if (isDefaultLat && isDefaultLon) {
      console.log('Solar Theme: Auto-detecting location...');
      const location = await autoDetectLocation();
      
      if (location) {
        await config.update('latitude', location.latitude, vscode.ConfigurationTarget.Global);
        await config.update('longitude', location.longitude, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage(
          `☀️ Solar Theme: Location set to ${location.city} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`
        );
        console.log(`Solar Theme: Location auto-detected: ${location.city}`);
      }
    }
    
    await context.globalState.update('solarTheme.locationInitialized', true);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Solar Theme extension is now active');
  
  // Auto-detect location on first run
  initializeLocation(context);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'solarTheme.showSunTimes';
  context.subscriptions.push(statusBarItem);

  // Register commands
  const updateNowCommand = vscode.commands.registerCommand(
    'solarTheme.updateNow',
    () => updateColors(true)
  );

  const showSunTimesCommand = vscode.commands.registerCommand(
    'solarTheme.showSunTimes',
    showSunTimes
  );

  const toggleEnabledCommand = vscode.commands.registerCommand(
    'solarTheme.toggleEnabled',
    toggleEnabled
  );

  const resetColorsCommand = vscode.commands.registerCommand(
    'solarTheme.resetColors',
    resetColors
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    'solarTheme.openSettings',
    () => {
      SettingsPanel.createOrShow(
        context.extensionUri,
        (colors) => {
          // Live preview: apply colors as user changes them
          applyCustomPalettes(colors);
        },
        () => {
          // Called when user starts previewing - pause auto-updates
          isPreviewing = true;
          
          // Clear any existing timeout
          if (previewTimeout) {
            clearTimeout(previewTimeout);
          }
          
          // Resume auto-updates after 10 seconds of no previewing
          previewTimeout = setTimeout(() => {
            isPreviewing = false;
          }, 10000);
        }
      );
    }
  );

  // Command to apply preview colors from settings panel
  const applyPreviewColorsCommand = vscode.commands.registerCommand(
    'solarTheme.applyPreviewColors',
    async (colors: { bg: string; fg: string; accent: string }) => {
      // Pause auto-updates for longer during preview
      isPreviewing = true;
      if (previewTimeout) {
        clearTimeout(previewTimeout);
      }
      previewTimeout = setTimeout(() => {
        isPreviewing = false;
        updateErrorCount = 0; // Reset error count when resuming
      }, 5000);
      
      // Apply the colors
      const colorCustomizations: Record<string, string> = {
        'editor.background': colors.bg,
        'editor.foreground': colors.fg,
        'sideBar.background': colors.bg,
        'sideBar.foreground': colors.fg,
        'activityBar.background': colors.bg,
        'activityBar.foreground': colors.fg,
        'statusBar.background': colors.accent,
        'statusBar.foreground': '#ffffff',
        'titleBar.activeBackground': colors.bg,
        'titleBar.activeForeground': colors.fg,
        'tab.activeBackground': colors.bg,
        'tab.inactiveBackground': colors.bg,
        'tab.activeForeground': colors.fg,
        'terminal.background': colors.bg,
        'panel.background': colors.bg,
        'editorGroupHeader.tabsBackground': colors.bg,
        'focusBorder': colors.accent,
        'button.background': colors.accent,
        'button.foreground': '#ffffff',
        'badge.background': colors.accent,
        'badge.foreground': '#ffffff',
      };
      
      try {
        await vscode.workspace.getConfiguration('workbench').update(
          'colorCustomizations',
          colorCustomizations,
          vscode.ConfigurationTarget.Global
        );
        lastAppliedColors = JSON.stringify(colorCustomizations);
      } catch (err) {
        // Silent fail for preview - user will see it's not working
        console.log('Solar Theme: Preview blocked (settings file may be open)');
      }
    }
  );

  context.subscriptions.push(
    updateNowCommand,
    showSunTimesCommand,
    toggleEnabledCommand,
    resetColorsCommand,
    openSettingsCommand,
    applyPreviewColorsCommand
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('solarTheme')) {
        restartUpdateInterval();
        updateColors(false);
      }
    })
  );

  // Start the update interval
  restartUpdateInterval();

  // Initial color update
  updateColors(false);
}

function getConfig(): SolarConfig {
  const config = vscode.workspace.getConfiguration('solarTheme');
  return {
    enabled: config.get('enabled', true),
    latitude: config.get('latitude', 30.35),
    longitude: config.get('longitude', -97.74),
    updateIntervalSeconds: config.get('updateIntervalSeconds', 5),
    showNotifications: config.get('showNotifications', false),
    intensity: config.get('intensity', 100),
  };
}

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Lerp between two colors
function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  const r = c1.r + (c2.r - c1.r) * t;
  const g = c1.g + (c2.g - c1.g) * t;
  const b = c1.b + (c2.b - c1.b) * t;
  
  return rgbToHex(r, g, b);
}

// Lerp between two palettes
function lerpPalette(
  palette1: ColorPalette,
  palette2: ColorPalette,
  t: number
): ColorPalette {
  const result: Partial<ColorPalette> = {};
  
  for (const key of Object.keys(palette1) as (keyof ColorPalette)[]) {
    result[key] = lerpColor(palette1[key], palette2[key], t);
  }
  
  return result as ColorPalette;
}

// Get current time as hours (0-24) adjusted for sun position
function getSolarTime(config: SolarConfig): number {
  const now = new Date();
  const times = SunCalc.getTimes(now, config.latitude, config.longitude) as {
    sunrise: Date;
    sunset: Date;
    solarNoon: Date;
  };

  const currentHour = now.getHours() + now.getMinutes() / 60;
  const sunriseHour = times.sunrise.getHours() + times.sunrise.getMinutes() / 60;
  const sunsetHour = times.sunset.getHours() + times.sunset.getMinutes() / 60;
  
  // Adjust the time phases based on actual sunrise/sunset
  // This maps the fixed time phases to the actual solar day
  const sunriseDiff = sunriseHour - 6.5; // Default sunrise in phases is 6:30
  const sunsetDiff = sunsetHour - 18;    // Default sunset in phases is 18:00
  
  // Simple adjustment: shift current time based on sun position
  if (currentHour >= sunriseHour && currentHour <= sunsetHour) {
    // Daytime: interpolate between sunrise and sunset
    const dayProgress = (currentHour - sunriseHour) / (sunsetHour - sunriseHour);
    return 6.5 + dayProgress * (18 - 6.5);
  } else if (currentHour < sunriseHour) {
    // Before sunrise
    const nightProgress = currentHour / sunriseHour;
    return nightProgress * 6.5;
  } else {
    // After sunset
    const nightProgress = (currentHour - sunsetHour) / (24 - sunsetHour);
    return 18 + nightProgress * 6;
  }
}

// Get interpolated palette for current time
function getCurrentPalette(config: SolarConfig): ColorPalette {
  const solarTime = getSolarTime(config);
  
  // Find the two phases we're between
  let prevPhase = TIME_PHASES[0];
  let nextPhase = TIME_PHASES[1];
  
  for (let i = 0; i < TIME_PHASES.length - 1; i++) {
    if (solarTime >= TIME_PHASES[i].time && solarTime < TIME_PHASES[i + 1].time) {
      prevPhase = TIME_PHASES[i];
      nextPhase = TIME_PHASES[i + 1];
      break;
  }
}

  // Calculate interpolation factor
  const t = (solarTime - prevPhase.time) / (nextPhase.time - prevPhase.time);
  
  // Get the two palettes and interpolate
  const palette1 = PALETTES[prevPhase.palette];
  const palette2 = PALETTES[nextPhase.palette];
  
  return lerpPalette(palette1, palette2, t);
}

// Get phase name for status bar
function getCurrentPhase(config: SolarConfig): string {
  const solarTime = getSolarTime(config);
  
  if (solarTime < 5) return 'night';
  if (solarTime < 6) return 'pre-dawn';
  if (solarTime < 7) return 'dawn';
  if (solarTime < 8) return 'sunrise';
  if (solarTime < 11) return 'morning';
  if (solarTime < 14) return 'midday';
  if (solarTime < 17) return 'afternoon';
  if (solarTime < 18) return 'golden hour';
  if (solarTime < 19) return 'sunset';
  if (solarTime < 20) return 'dusk';
  return 'night';
}

// Get emoji for current phase
function getPhaseEmoji(phase: string): string {
  const emojis: Record<string, string> = {
    'night': '🌙',
    'pre-dawn': '🌌',
    'dawn': '🌅',
    'sunrise': '🌄',
    'morning': '☀️',
    'midday': '🌞',
    'afternoon': '⛅',
    'golden hour': '🌇',
    'sunset': '🌆',
    'dusk': '🌃',
  };
  return emojis[phase] || '☀️';
}

async function updateColors(force: boolean): Promise<void> {
  // Skip updates while user is previewing
  if (isPreviewing && !force) {
    return;
  }

  const config = getConfig();

  if (!config.enabled) {
    statusBarItem.hide();
    return;
  }

  const phase = getCurrentPhase(config);
  const emoji = getPhaseEmoji(phase);
  const palette = getCurrentPalette(config);

  // Update status bar
  statusBarItem.text = `${emoji}`;
  statusBarItem.tooltip = `Solar Theme: ${phase}\nClick for details`;
  statusBarItem.show();

  // Apply color customizations
  const intensity = config.intensity / 100;
  
  // Build comprehensive color customizations - eliminate all black areas
  const bg = palette.editorBackground;
  const bgDark = palette.activityBarBackground;
  const bgMid = palette.sidebarBackground;
  const bgLight = palette.tabActiveBackground;
  const fg = palette.editorForeground;
  const fgDim = palette.sidebarForeground;
  const accent = palette.accentColor;
  const border = palette.borderColor;
  
  const colorCustomizations: Record<string, string> = {
    // ===== EDITOR =====
    'editor.background': bg,
    'editor.foreground': fg,
    'editorLineNumber.foreground': fgDim,
    'editorLineNumber.activeForeground': fg,
    'editorCursor.foreground': fg,
    'editor.selectionBackground': accent + '50',
    'editor.selectionHighlightBackground': accent + '30',
    'editor.wordHighlightBackground': accent + '30',
    'editor.wordHighlightStrongBackground': accent + '40',
    'editor.findMatchBackground': accent + '50',
    'editor.findMatchHighlightBackground': accent + '30',
    'editor.hoverHighlightBackground': accent + '20',
    'editor.lineHighlightBackground': bgLight,
    'editor.rangeHighlightBackground': accent + '15',
    'editorLink.activeForeground': fg,
    'editorIndentGuide.background1': border,
    'editorIndentGuide.activeBackground1': fgDim,
    'editorWhitespace.foreground': border,
    'editorRuler.foreground': border,
    'editorBracketMatch.background': accent + '40',
    'editorBracketMatch.border': accent,
    'editorError.foreground': '#c07070',
    'editorWarning.foreground': '#c0a070',
    'editorInfo.foreground': '#70a0c0',
    // ===== EDITOR GUTTER =====
    'editorGutter.background': bgMid,
    'editorGutter.modifiedBackground': '#8090a0',
    'editorGutter.addedBackground': '#80a080',
    'editorGutter.deletedBackground': '#a08080',
    // ===== EDITOR WIDGETS =====
    'editorWidget.background': bgMid,
    'editorWidget.foreground': fg,
    'editorWidget.border': border,
    'editorSuggestWidget.background': bgMid,
    'editorSuggestWidget.border': border,
    'editorSuggestWidget.foreground': fg,
    'editorSuggestWidget.highlightForeground': fg,
    'editorSuggestWidget.selectedBackground': accent + '60',
    'editorHoverWidget.background': bgMid,
    'editorHoverWidget.border': border,
    'editorHoverWidget.foreground': fg,
    // ===== PEEK VIEW =====
    'peekView.border': border,
    'peekViewEditor.background': bg,
    'peekViewEditorGutter.background': bgMid,
    'peekViewResult.background': bgMid,
    'peekViewResult.fileForeground': fg,
    'peekViewResult.lineForeground': fgDim,
    'peekViewResult.matchHighlightBackground': accent + '40',
    'peekViewResult.selectionBackground': accent + '40',
    'peekViewResult.selectionForeground': fg,
    'peekViewTitle.background': bgDark,
    'peekViewTitleDescription.foreground': fgDim,
    'peekViewTitleLabel.foreground': fg,
    // ===== DIFF EDITOR =====
    'diffEditor.insertedTextBackground': '#80a08020',
    'diffEditor.removedTextBackground': '#a0808020',
    'diffEditor.diagonalFill': border,
    // ===== BREADCRUMBS =====
    'breadcrumb.background': bgMid,
    'breadcrumb.foreground': fgDim,
    'breadcrumb.focusForeground': fg,
    'breadcrumb.activeSelectionForeground': fg,
    'breadcrumbPicker.background': bgMid,
    // ===== SIDEBAR =====
    'sideBar.background': bgMid,
    'sideBar.foreground': fgDim,
    'sideBar.border': bgDark,
    'sideBarTitle.foreground': fg,
    'sideBarSectionHeader.background': bgMid,
    'sideBarSectionHeader.foreground': fg,
    'sideBarSectionHeader.border': border,
    // ===== ACTIVITY BAR =====
    'activityBar.background': bgDark,
    'activityBar.foreground': fg,
    'activityBar.inactiveForeground': fgDim,
    'activityBar.border': bgDark,
    'activityBarBadge.background': accent,
    'activityBarBadge.foreground': fg,
    // ===== STATUS BAR =====
    'statusBar.background': bgDark,
    'statusBar.foreground': fgDim,
    'statusBar.border': bgDark,
    'statusBar.noFolderBackground': bgDark,
    'statusBar.debuggingBackground': bgDark,
    'statusBarItem.activeBackground': accent + '60',
    'statusBarItem.hoverBackground': accent + '40',
    'statusBarItem.prominentBackground': accent + '40',
    'statusBarItem.prominentHoverBackground': accent + '60',
    // ===== TITLE BAR =====
    'titleBar.activeBackground': bgDark,
    'titleBar.activeForeground': fg,
    'titleBar.inactiveBackground': bgDark,
    'titleBar.inactiveForeground': fgDim,
    'titleBar.border': bgDark,
    // ===== TABS =====
    'tab.activeBackground': bg,
    'tab.activeForeground': fg,
    'tab.inactiveBackground': bgMid,
    'tab.inactiveForeground': fgDim,
    'tab.border': '#00000000',
    'tab.activeBorder': '#00000000',
    'tab.activeBorderTop': '#00000000',
    'tab.unfocusedActiveBorder': '#00000000',
    'tab.unfocusedActiveBorderTop': '#00000000',
    'tab.hoverBackground': bg,
    'tab.hoverBorder': '#00000000',
    'editorGroupHeader.tabsBackground': bgMid,
    'editorGroupHeader.tabsBorder': '#00000000',
    'editorGroupHeader.noTabsBackground': bgMid,
    'editorGroup.border': '#00000000',
    'editorGroup.dropBackground': accent + '30',
    'editorGroup.emptyBackground': bg,
    'editorPane.background': bg,
    // ===== TERMINAL =====
    'terminal.background': bg,
    'terminal.foreground': fg,
    'terminal.border': border,
    'terminal.selectionBackground': accent + '50',
    'terminal.selectionForeground': fg,
    'terminalCursor.background': bg,
    'terminalCursor.foreground': fg,
    // Terminal ANSI colors - muted palette
    'terminal.ansiBlack': bgDark,
    'terminal.ansiRed': '#c08080',
    'terminal.ansiGreen': '#90b090',
    'terminal.ansiYellow': '#c0b080',
    'terminal.ansiBlue': '#8090b0',
    'terminal.ansiMagenta': '#a080a0',
    'terminal.ansiCyan': '#80a0a0',
    'terminal.ansiWhite': fg,
    'terminal.ansiBrightBlack': fgDim,
    'terminal.ansiBrightRed': '#d09090',
    'terminal.ansiBrightGreen': '#a0c0a0',
    'terminal.ansiBrightYellow': '#d0c090',
    'terminal.ansiBrightBlue': '#90a0c0',
    'terminal.ansiBrightMagenta': '#b090b0',
    'terminal.ansiBrightCyan': '#90b0b0',
    'terminal.ansiBrightWhite': '#e0e0e0',
    // ===== PANEL =====
    'panel.background': bg,
    'panel.border': border,
    'panel.dropBorder': accent,
    'panelTitle.activeBorder': accent,
    'panelTitle.activeForeground': fg,
    'panelTitle.inactiveForeground': fgDim,
    'panelInput.border': border,
    'panelSection.border': border,
    'panelSection.dropBackground': accent + '30',
    'panelSectionHeader.background': bgMid,
    'panelSectionHeader.foreground': fg,
    'panelSectionHeader.border': border,
    // ===== OUTPUT =====
    'outputView.background': bg,
    'outputViewStickyScroll.background': bgMid,
    // ===== DEBUG =====
    'debugToolBar.background': bgMid,
    'debugToolBar.border': border,
    'debugExceptionWidget.background': bgMid,
    'debugExceptionWidget.border': border,
    'debugConsole.infoForeground': '#90b0c0',
    'debugConsole.warningForeground': '#c0b080',
    'debugConsole.errorForeground': '#c09090',
    'debugConsole.sourceForeground': fgDim,
    'debugConsoleInputIcon.foreground': fg,
    'debugIcon.breakpointForeground': '#c09090',
    'debugIcon.breakpointDisabledForeground': fgDim,
    'debugIcon.breakpointUnverifiedForeground': fgDim,
    'debugIcon.startForeground': '#90b090',
    'debugIcon.pauseForeground': '#c0b080',
    'debugIcon.stopForeground': '#c09090',
    'debugIcon.disconnectForeground': '#c09090',
    'debugIcon.restartForeground': '#90b090',
    'debugIcon.stepOverForeground': '#90b0c0',
    'debugIcon.stepIntoForeground': '#90b0c0',
    'debugIcon.stepOutForeground': '#90b0c0',
    'debugIcon.continueForeground': '#90b090',
    'debugIcon.stepBackForeground': '#90b0c0',
    'debugTokenExpression.name': '#a0b0c0',
    'debugTokenExpression.value': fg,
    'debugTokenExpression.string': '#b0c098',
    'debugTokenExpression.boolean': '#c0b0a0',
    'debugTokenExpression.number': '#d4b8a0',
    'debugTokenExpression.error': '#c09090',
    'debugView.exceptionLabelForeground': fg,
    'debugView.exceptionLabelBackground': bgMid,
    'debugView.stateLabelForeground': fgDim,
    'debugView.stateLabelBackground': bgDark,
    'debugView.valueChangedHighlight': accent + '40',
    // ===== NOTIFICATIONS =====
    'notifications.background': bgMid,
    'notifications.foreground': fg,
    'notifications.border': border,
    'notificationCenter.border': border,
    'notificationCenterHeader.background': bgDark,
    'notificationCenterHeader.foreground': fg,
    'notificationToast.border': border,
    'notificationsErrorIcon.foreground': '#c07070',
    'notificationsWarningIcon.foreground': '#c0a070',
    'notificationsInfoIcon.foreground': '#70a0c0',
    // ===== QUICK INPUT =====
    'quickInput.background': bgMid,
    'quickInput.foreground': fg,
    'quickInputList.focusBackground': accent + '50',
    'quickInputList.focusForeground': fg,
    'quickInputTitle.background': bgDark,
    // ===== INPUT & BUTTONS =====
    'input.background': bgDark,
    'input.foreground': fg,
    'input.border': border,
    'input.placeholderForeground': fgDim,
    'inputOption.activeBackground': accent + '50',
    'inputOption.activeBorder': accent,
    'inputOption.activeForeground': fg,
    'inputValidation.errorBackground': bgMid,
    'inputValidation.errorBorder': '#c07070',
    'inputValidation.warningBackground': bgMid,
    'inputValidation.warningBorder': '#c0a070',
    'inputValidation.infoBackground': bgMid,
    'inputValidation.infoBorder': '#70a0c0',
    'dropdown.background': bgMid,
    'dropdown.foreground': fg,
    'dropdown.border': border,
    'dropdown.listBackground': bgMid,
    'button.background': accent,
    'button.foreground': fg,
    'button.hoverBackground': accent + 'cc',
    'button.secondaryBackground': bgMid,
    'button.secondaryForeground': fg,
    'button.secondaryHoverBackground': bgLight,
    'checkbox.background': bgDark,
    'checkbox.foreground': fg,
    'checkbox.border': border,
    // ===== LISTS & TREES =====
    'list.activeSelectionBackground': accent + '50',
    'list.activeSelectionForeground': fg,
    'list.hoverBackground': bgLight,
    'list.hoverForeground': fg,
    'list.focusBackground': accent + '40',
    'list.focusForeground': fg,
    'list.inactiveSelectionBackground': bgLight,
    'list.inactiveSelectionForeground': fg,
    'list.inactiveFocusBackground': bgLight,
    'list.highlightForeground': fg,
    'list.dropBackground': accent + '30',
    'list.errorForeground': '#c07070',
    'list.warningForeground': '#c0a070',
    'tree.indentGuidesStroke': border,
    'tree.tableColumnsBorder': border,
    'listFilterWidget.background': bgMid,
    'listFilterWidget.outline': border,
    'listFilterWidget.noMatchesOutline': '#c07070',
    // ===== GIT DECORATIONS =====
    'gitDecoration.modifiedResourceForeground': '#c0b080',
    'gitDecoration.deletedResourceForeground': '#808080',
    'gitDecoration.untrackedResourceForeground': '#d0d0d0',
    'gitDecoration.ignoredResourceForeground': '#606060',
    'gitDecoration.conflictingResourceForeground': '#b89060',
    'gitDecoration.addedResourceForeground': '#d0d0d0',
    // ===== SCROLLBAR =====
    'scrollbar.shadow': '#00000030',
    'scrollbarSlider.background': fgDim + '40',
    'scrollbarSlider.hoverBackground': fgDim + '60',
    'scrollbarSlider.activeBackground': fgDim + '80',
    // ===== MINIMAP =====
    'minimap.background': bgMid,
    'minimap.selectionHighlight': accent + '60',
    'minimap.findMatchHighlight': accent + '80',
    'minimapSlider.background': fgDim + '20',
    'minimapSlider.hoverBackground': fgDim + '30',
    'minimapSlider.activeBackground': fgDim + '40',
    'minimapGutter.addedBackground': '#90a090',
    'minimapGutter.modifiedBackground': '#90a0b0',
    'minimapGutter.deletedBackground': '#a09090',
    // ===== SETTINGS EDITOR =====
    'settings.headerForeground': fg,
    'settings.modifiedItemIndicator': accent,
    'settings.dropdownBackground': bgMid,
    'settings.dropdownForeground': fg,
    'settings.dropdownBorder': border,
    'settings.checkboxBackground': bgDark,
    'settings.checkboxForeground': fg,
    'settings.checkboxBorder': border,
    'settings.textInputBackground': bgDark,
    'settings.textInputForeground': fg,
    'settings.textInputBorder': border,
    'settings.numberInputBackground': bgDark,
    'settings.numberInputForeground': fg,
    'settings.numberInputBorder': border,
    // ===== WELCOME PAGE =====
    'welcomePage.background': bg,
    'welcomePage.tileBackground': bgMid,
    'welcomePage.tileHoverBackground': bgLight,
    'welcomePage.tileBorder': border,
    'walkThrough.embeddedEditorBackground': bgMid,
    // ===== EXTENSION BUTTONS =====
    'extensionButton.prominentBackground': accent,
    'extensionButton.prominentForeground': fg,
    'extensionButton.prominentHoverBackground': accent + 'cc',
    'extensionBadge.remoteBackground': accent,
    'extensionBadge.remoteForeground': fg,
    // ===== KEYBINDING =====
    'keybindingLabel.background': bgMid,
    'keybindingLabel.foreground': fg,
    'keybindingLabel.border': border,
    'keybindingLabel.bottomBorder': border,
    // ===== FOCUS & BADGES =====
    'focusBorder': '#00000000',
    'contrastBorder': '#00000000',
    'contrastActiveBorder': '#00000000',
    'selection.background': accent + '40',
    'badge.background': accent,
    'badge.foreground': fg,
    'progressBar.background': accent,
    'icon.foreground': fgDim,
    // ===== MENU =====
    'menu.background': bgMid,
    'menu.foreground': fg,
    'menu.selectionBackground': accent + '50',
    'menu.selectionForeground': fg,
    'menu.separatorBackground': border,
    'menubar.selectionBackground': accent + '40',
    'menubar.selectionForeground': fg,
  };

  // Check if colors actually changed to avoid unnecessary writes
  const colorsHash = JSON.stringify(colorCustomizations);
  if (!force && colorsHash === lastAppliedColors) {
    return; // No change, skip update
  }

  // Auto-save any dirty settings.json files to prevent write conflicts
  const settingsDocuments = vscode.workspace.textDocuments.filter(doc => 
    doc.fileName.endsWith('settings.json') && doc.isDirty
  );
  for (const doc of settingsDocuments) {
    await doc.save();
  }

  // Muted syntax colors with good contrast - work with all backgrounds
  const tokenColorCustomizations = {
    "comments": "#7a8490",
    "strings": "#b0c098",
    "keywords": "#a8b5c2",
    "numbers": "#d4b8a0",
    "types": "#b8b0c8",
    "functions": "#98b0b8",
    "variables": "#d0d4de",
    "textMateRules": [
      { "scope": "comment", "settings": { "foreground": "#7a8490", "fontStyle": "italic" } },
      { "scope": "string", "settings": { "foreground": "#b0c098" } },
      { "scope": "constant.numeric", "settings": { "foreground": "#d4b8a0" } },
      { "scope": "constant.language", "settings": { "foreground": "#c8b0a0" } },
      { "scope": "constant.other", "settings": { "foreground": "#dcc8a0" } },
      { "scope": "keyword", "settings": { "foreground": "#a8b5c2" } },
      { "scope": "storage", "settings": { "foreground": "#a8b5c2" } },
      { "scope": "entity.name.function", "settings": { "foreground": "#98b0b8" } },
      { "scope": "entity.name.type", "settings": { "foreground": "#b8b0c8" } },
      { "scope": "entity.name.class", "settings": { "foreground": "#b8b0c8" } },
      { "scope": "entity.name.tag", "settings": { "foreground": "#a0b0b8" } },
      { "scope": "entity.other.attribute-name", "settings": { "foreground": "#b8b0a8" } },
      { "scope": "variable", "settings": { "foreground": "#d0d4de" } },
      { "scope": "variable.parameter", "settings": { "foreground": "#c8d0d8" } },
      { "scope": "support.function", "settings": { "foreground": "#98b0b8" } },
      { "scope": "support.type", "settings": { "foreground": "#b8b0c8" } },
      { "scope": "punctuation", "settings": { "foreground": "#a8b0b8" } },
      { "scope": "meta.decorator", "settings": { "foreground": "#b8a8a0" } },
      { "scope": "markup.heading", "settings": { "foreground": "#c8c0b0", "fontStyle": "bold" } },
      { "scope": "markup.bold", "settings": { "fontStyle": "bold" } },
      { "scope": "markup.italic", "settings": { "fontStyle": "italic" } },
    ]
  };

  try {
    await vscode.workspace.getConfiguration('workbench').update(
      'colorCustomizations',
      colorCustomizations,
      vscode.ConfigurationTarget.Global
    );
    
    await vscode.workspace.getConfiguration('editor').update(
      'tokenColorCustomizations',
      tokenColorCustomizations,
      vscode.ConfigurationTarget.Global
    );

    // Success - reset error count and store hash
    lastAppliedColors = colorsHash;
    updateErrorCount = 0;

    if (force && config.showNotifications) {
      vscode.window.showInformationMessage(
        `${emoji} Solar Theme: ${phase}`
      );
    }

    console.log(`Solar Theme: Updated colors for ${phase}`);
  } catch (error) {
    updateErrorCount++;
    // Only log error occasionally to avoid spam
    if (updateErrorCount <= 3) {
      console.error('Solar Theme: Failed to update colors', error);
    }
    // After 5 consecutive errors, show a one-time warning
    if (updateErrorCount === 5) {
      vscode.window.showWarningMessage(
        'Solar Theme: Unable to update colors. Please close any open settings.json files.'
      );
    }
  }
}

function restartUpdateInterval(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  const config = getConfig();
  const intervalMs = config.updateIntervalSeconds * 1000;

  updateInterval = setInterval(() => {
    updateColors(false);
  }, intervalMs);
}

async function showSunTimes(): Promise<void> {
  const config = getConfig();
  const now = new Date();
  const times = SunCalc.getTimes(now, config.latitude, config.longitude) as {
    sunrise: Date;
    sunset: Date;
    solarNoon: Date;
  };

  const phase = getCurrentPhase(config);
  const emoji = getPhaseEmoji(phase);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const result = await vscode.window.showInformationMessage(
    `${phase.charAt(0).toUpperCase() + phase.slice(1)}`,
    { modal: true, detail: `☀️ ${formatTime(times.sunrise)}  ·  🌙 ${formatTime(times.sunset)}` },
    'Customize',
    'Reset'
  );

  if (result === 'Customize') {
    vscode.commands.executeCommand('solarTheme.openSettings');
  } else if (result === 'Reset') {
    resetColors();
  }
}

async function toggleEnabled(): Promise<void> {
  const config = getConfig();
  const newValue = !config.enabled;

  if (!newValue) {
    // Reset colors when disabling
    await resetColors();
  }

  await vscode.workspace
    .getConfiguration('solarTheme')
    .update('enabled', newValue, vscode.ConfigurationTarget.Global);

  vscode.window.showInformationMessage(
    `Solar Theme: ${newValue ? 'Enabled' : 'Disabled'}`
  );

  if (newValue) {
    updateColors(false);
  }
}

async function resetColors(): Promise<void> {
  try {
    // Re-apply Solar Theme's current time-based colors (not VS Code defaults)
    await updateColors(true);
    vscode.window.showInformationMessage('Solar Theme: Colors reset to current time');
  } catch (error) {
    console.error('Solar Theme: Failed to reset colors', error);
  }
}

// Apply custom palettes from settings panel (live preview)
function applyCustomPalettes(customColors: Record<string, Record<string, string>>): void {
  // Store custom palettes temporarily for live preview
  const config = getConfig();
  const phase = getCurrentPhase(config);
  
  if (customColors[phase]) {
    const custom = customColors[phase];
    const colorCustomizations: Record<string, string> = {
      'editor.background': custom.bg,
      'editor.foreground': custom.fg,
      'sideBar.background': custom.bg,
      'activityBar.background': custom.bg,
      'statusBar.background': custom.accent,
      'titleBar.activeBackground': custom.bg,
      'focusBorder': custom.accent,
      'button.background': custom.accent,
      'badge.background': custom.accent,
      'progressBar.background': custom.accent,
    };

    vscode.workspace.getConfiguration('workbench').update(
      'colorCustomizations',
      colorCustomizations,
      vscode.ConfigurationTarget.Global
    );
  }
}

export function deactivate(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  // Optionally reset colors on deactivate
  // resetColors();
}
