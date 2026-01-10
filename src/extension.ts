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

const PALETTES: Record<string, ColorPalette> = {
  // Deep night - cool slate with blue undertone
  night: {
    editorBackground: '#101214',
    editorForeground: '#a1a7b3',
    sidebarBackground: '#0c0e10',
    sidebarForeground: '#6b7280',
    activityBarBackground: '#08090b',
    statusBarBackground: '#08090b',
    titleBarBackground: '#08090b',
    tabBackground: '#0c0e10',
    tabActiveBackground: '#101214',
    accentColor: '#4b5563',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#0e1012',
    borderColor: '#1a1e22',
  },
  // Pre-dawn - dark with faint violet undertone
  preDawn: {
    editorBackground: '#110f14',
    editorForeground: '#a8a3b0',
    sidebarBackground: '#0d0b10',
    sidebarForeground: '#706b7a',
    activityBarBackground: '#09080c',
    statusBarBackground: '#09080c',
    titleBarBackground: '#09080c',
    tabBackground: '#0d0b10',
    tabActiveBackground: '#110f14',
    accentColor: '#5b5270',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#0f0d12',
    borderColor: '#1c1822',
  },
  // Dawn - warm dark with amber undertone
  dawn: {
    editorBackground: '#141210',
    editorForeground: '#b0a89a',
    sidebarBackground: '#100e0c',
    sidebarForeground: '#7a7368',
    activityBarBackground: '#0c0a08',
    statusBarBackground: '#0c0a08',
    titleBarBackground: '#0c0a08',
    tabBackground: '#100e0c',
    tabActiveBackground: '#141210',
    accentColor: '#6b5c4a',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#12100e',
    borderColor: '#221e16',
  },
  // Sunrise - warm dark with soft terracotta
  sunrise: {
    editorBackground: '#151311',
    editorForeground: '#b3aa9c',
    sidebarBackground: '#110f0d',
    sidebarForeground: '#7d7568',
    activityBarBackground: '#0d0b09',
    statusBarBackground: '#0d0b09',
    titleBarBackground: '#0d0b09',
    tabBackground: '#110f0d',
    tabActiveBackground: '#151311',
    accentColor: '#70604e',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#13110f',
    borderColor: '#241e18',
  },
  // Morning - warm neutral dark
  morning: {
    editorBackground: '#141312',
    editorForeground: '#afa89e',
    sidebarBackground: '#100f0e',
    sidebarForeground: '#78736a',
    activityBarBackground: '#0c0b0a',
    statusBarBackground: '#0c0b0a',
    titleBarBackground: '#0c0b0a',
    tabBackground: '#100f0e',
    tabActiveBackground: '#141312',
    accentColor: '#605850',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#121110',
    borderColor: '#201e1c',
  },
  // Midday - neutral dark (pure gray)
  midday: {
    editorBackground: '#131313',
    editorForeground: '#a8a8a8',
    sidebarBackground: '#0f0f0f',
    sidebarForeground: '#737373',
    activityBarBackground: '#0b0b0b',
    statusBarBackground: '#0b0b0b',
    titleBarBackground: '#0b0b0b',
    tabBackground: '#0f0f0f',
    tabActiveBackground: '#131313',
    accentColor: '#585858',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#111111',
    borderColor: '#1e1e1e',
  },
  // Afternoon - slight cool shift
  afternoon: {
    editorBackground: '#121314',
    editorForeground: '#a5a8ac',
    sidebarBackground: '#0e0f10',
    sidebarForeground: '#707478',
    activityBarBackground: '#0a0b0c',
    statusBarBackground: '#0a0b0c',
    titleBarBackground: '#0a0b0c',
    tabBackground: '#0e0f10',
    tabActiveBackground: '#121314',
    accentColor: '#545860',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#101112',
    borderColor: '#1c1e20',
  },
  // Golden hour - warm with muted rose
  goldenHour: {
    editorBackground: '#141211',
    editorForeground: '#b0a69a',
    sidebarBackground: '#100e0d',
    sidebarForeground: '#787068',
    activityBarBackground: '#0c0a09',
    statusBarBackground: '#0c0a09',
    titleBarBackground: '#0c0a09',
    tabBackground: '#100e0d',
    tabActiveBackground: '#141211',
    accentColor: '#685850',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#12100f',
    borderColor: '#201c18',
  },
  // Sunset - warm with muted mauve
  sunset: {
    editorBackground: '#131114',
    editorForeground: '#aca6b0',
    sidebarBackground: '#0f0d10',
    sidebarForeground: '#756f7a',
    activityBarBackground: '#0b090c',
    statusBarBackground: '#0b090c',
    titleBarBackground: '#0b090c',
    tabBackground: '#0f0d10',
    tabActiveBackground: '#131114',
    accentColor: '#605560',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#110f12',
    borderColor: '#1e1a20',
  },
  // Dusk - cool with subtle violet
  dusk: {
    editorBackground: '#111014',
    editorForeground: '#a6a3b0',
    sidebarBackground: '#0d0c10',
    sidebarForeground: '#6e6b78',
    activityBarBackground: '#09080c',
    statusBarBackground: '#09080c',
    titleBarBackground: '#09080c',
    tabBackground: '#0d0c10',
    tabActiveBackground: '#111014',
    accentColor: '#555060',
    accentForeground: ACCENT_FOREGROUND,
    terminalBackground: '#0f0e12',
    borderColor: '#1a181e',
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
          
          // Resume auto-updates after 3 seconds of no previewing
          previewTimeout = setTimeout(() => {
            isPreviewing = false;
          }, 3000);
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
  statusBarItem.text = `${emoji} Solar`;
  statusBarItem.tooltip = `Solar Theme: ${phase}\nClick for details`;
  statusBarItem.show();

  // Apply color customizations
  const intensity = config.intensity / 100;
  
  // Build color customizations object
  const colorCustomizations: Record<string, string> = {
    'editor.background': palette.editorBackground,
    'editor.foreground': palette.editorForeground,
    'sideBar.background': palette.sidebarBackground,
    'sideBar.foreground': palette.sidebarForeground,
    'activityBar.background': palette.activityBarBackground,
    'activityBar.foreground': palette.accentForeground,
    'statusBar.background': palette.statusBarBackground,
    'statusBar.foreground': palette.accentForeground,
    'titleBar.activeBackground': palette.titleBarBackground,
    'titleBar.activeForeground': palette.editorForeground,
    'tab.activeBackground': palette.tabActiveBackground,
    'tab.inactiveBackground': palette.tabBackground,
    'tab.activeForeground': palette.editorForeground,
    'terminal.background': palette.terminalBackground,
    'panel.background': palette.sidebarBackground,
    'panel.border': palette.borderColor,
    'editorGroupHeader.tabsBackground': palette.tabBackground,
    'focusBorder': palette.accentColor,
    'button.background': palette.accentColor,
    'button.foreground': palette.accentForeground,
    'badge.background': palette.accentColor,
    'badge.foreground': palette.accentForeground,
    'progressBar.background': palette.accentColor,
    'inputOption.activeBorder': palette.accentColor,
    'list.activeSelectionBackground': palette.accentColor,
    'list.activeSelectionForeground': palette.accentForeground,
    'list.hoverBackground': palette.tabBackground,
    'sideBarSectionHeader.background': palette.sidebarBackground,
    'sideBarSectionHeader.foreground': palette.sidebarForeground,
  };

  // Check if colors actually changed to avoid unnecessary writes
  const colorsHash = JSON.stringify(colorCustomizations);
  if (!force && colorsHash === lastAppliedColors) {
    return; // No change, skip update
  }

  try {
    await vscode.workspace.getConfiguration('workbench').update(
      'colorCustomizations',
      colorCustomizations,
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

  const message = `
🌅 ${formatTime(times.sunrise)}  →  🌆 ${formatTime(times.sunset)}

Open the Settings Panel to preview colors, customize phases, and scrub through the day!
  `.trim();

  const result = await vscode.window.showInformationMessage(
    `${emoji} ${phase.charAt(0).toUpperCase() + phase.slice(1)}`,
    { modal: true, detail: message },
    '✨ Open Settings',
    'Reset Colors'
  );

  if (result === '✨ Open Settings') {
    vscode.commands.executeCommand('solarTheme.openSettings');
  } else if (result === 'Reset Colors') {
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
    await vscode.workspace.getConfiguration('workbench').update(
      'colorCustomizations',
      undefined,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage('Solar Theme: Colors reset to default');
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
