import * as vscode from 'vscode';

export class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _onColorsChanged: (colors: Record<string, Record<string, string>>) => void;
  private _onPreviewStart: () => void;
  private _isUpdating = false;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    onColorsChanged: (colors: Record<string, Record<string, string>>) => void,
    onPreviewStart: () => void
  ) {
    this._panel = panel;
    this._onColorsChanged = onColorsChanged;
    this._onPreviewStart = onPreviewStart;

    this._panel.webview.html = this._getHtmlContent();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'colorsChanged':
            this._onColorsChanged(message.colors);
            break;
          case 'saveColors':
            this._saveColors(message.colors);
            break;
          case 'resetColors':
            this._resetColors();
            break;
          case 'previewPhase':
            await this._previewPhase(message.phase, message.colors);
            break;
          case 'intensityChanged':
            // Handle intensity changes
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    onColorsChanged: (colors: Record<string, Record<string, string>>) => void,
    onPreviewStart: () => void
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SettingsPanel.currentPanel) {
      // Update callbacks in case extension was reloaded
      SettingsPanel.currentPanel._onColorsChanged = onColorsChanged;
      SettingsPanel.currentPanel._onPreviewStart = onPreviewStart;
      SettingsPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'solarThemeSettings',
      '☀️ Solar Theme Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri, onColorsChanged, onPreviewStart);
  }

  private async _saveColors(colors: Record<string, Record<string, string>>) {
    await vscode.workspace.getConfiguration('solarTheme').update(
      'customPalettes',
      colors,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage('Solar Theme: Custom colors saved!');
  }

  private async _resetColors() {
    await vscode.workspace.getConfiguration('solarTheme').update(
      'customPalettes',
      undefined,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage('Solar Theme: Colors reset to defaults!');
  }

  private async _previewPhase(phase: string, colors: { bg: string; fg: string; accent: string }) {
    // Check if colors are valid
    if (!colors || !colors.bg || !colors.fg || !colors.accent) {
      return;
    }
    
    // Notify extension to pause auto-updates during preview
    if (this._onPreviewStart) {
      this._onPreviewStart();
    }
    
    // Skip if already updating
    if (this._isUpdating) {
      return;
    }
    this._isUpdating = true;
    
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
    } catch {
      // Silent fail
    } finally {
      this._isUpdating = false;
    }
  }

  public dispose() {
    SettingsPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlContent(): string {
    return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solar Theme Settings</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --accent: #f97316;
      --accent-hover: #fb923c;
      --border: #30363d;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 24px;
      line-height: 1.6;
    }

    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .subtitle {
      color: var(--text-secondary);
      margin-bottom: 32px;
    }

    /* Timeline Preview */
    .timeline-container {
      margin-bottom: 40px;
    }

    .timeline-label {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
      color: var(--text-secondary);
    }

    .timeline {
      height: 60px;
      border-radius: 12px;
      display: flex;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .timeline-segment {
      flex: 1;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 8px;
      font-size: 11px;
      font-weight: 500;
      color: white;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      cursor: pointer;
      transition: transform 0.2s, filter 0.2s;
    }

    .timeline-segment:hover {
      transform: scaleY(1.1);
      filter: brightness(1.1);
    }

    /* Phase Cards */
    .phases-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .phase-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .phase-card:hover {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }

    .phase-card.selected {
      border-color: #64748b;
      box-shadow: 0 0 0 2px #64748b;
    }

    .preview-btn {
      background: #3f3f46;
      color: #a1a1aa;
      border: 1px solid #52525b;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 12px;
      width: 100%;
      transition: all 0.2s;
    }

    .preview-btn:hover {
      background: #52525b;
      color: #e4e4e7;
      border-color: #71717a;
    }

    .phase-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .phase-emoji {
      font-size: 24px;
    }

    .phase-name {
      font-size: 16px;
      font-weight: 600;
    }

    .phase-time {
      font-size: 12px;
      color: var(--text-secondary);
      margin-left: auto;
    }

    .color-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .color-label {
      font-size: 13px;
      color: var(--text-secondary);
      width: 100px;
      flex-shrink: 0;
    }

    .color-picker-wrapper {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid var(--border);
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .color-picker-wrapper:hover {
      border-color: var(--accent);
    }

    .color-picker {
      position: absolute;
      top: -8px;
      left: -8px;
      width: 52px;
      height: 52px;
      border: none;
      cursor: pointer;
    }

    .color-hex {
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 10px;
      color: var(--text-primary);
      width: 90px;
    }

    .color-hex:focus {
      outline: none;
      border-color: var(--accent);
    }

    /* Preview Box */
    .preview-box {
      width: 100%;
      height: 40px;
      border-radius: 8px;
      margin-top: 16px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      font-size: 13px;
      transition: all 0.3s;
    }

    /* Buttons */
    .button-row {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover);
    }

    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      border-color: var(--text-secondary);
    }

    /* Intensity Slider */
    .intensity-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .intensity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .intensity-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .intensity-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      font-family: 'SF Mono', Monaco, monospace;
    }

    .intensity-description {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .intensity-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, #27272a, #52525b, #71717a);
      appearance: none;
      outline: none;
      cursor: pointer;
    }

    .intensity-slider::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #e4e4e7;
      border: 2px solid #a1a1aa;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: all 0.15s;
    }

    .intensity-slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      background: #ffffff;
    }

    .intensity-scale {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 11px;
      color: var(--text-secondary);
    }

    .time-slider + .intensity-scale {
      font-size: 10px;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .phases-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <h1>☀️ Solar Theme Settings</h1>
  <p class="subtitle">Customize the colors for each time of day</p>

  <div class="timeline-container">
    <div class="timeline-label">24-Hour Color Timeline</div>
    <div class="timeline" id="timeline"></div>
  </div>

  <div class="intensity-container">
    <div class="intensity-header">
      <span class="intensity-label">🎨 Color Intensity</span>
      <span class="intensity-value" id="intensityValue">50%</span>
    </div>
    <div class="intensity-description">Adjust vibrancy: left = muted/subtle, right = vivid/saturated</div>
    <input type="range" class="intensity-slider" id="intensitySlider" min="0" max="100" value="50">
    <div class="intensity-scale">
      <span>Muted</span>
      <span>Balanced</span>
      <span>Vivid</span>
    </div>
  </div>

  <div class="intensity-container">
    <div class="intensity-header">
      <span class="intensity-label">⏱️ Time Preview</span>
      <span class="intensity-value" id="timeValue">12:00 PM</span>
    </div>
    <div class="intensity-description">Scrub through the day to preview how colors change</div>
    <input type="range" class="intensity-slider time-slider" id="timeSlider" min="0" max="1440" value="720">
    <div class="intensity-scale">
      <span>🌙 12AM</span>
      <span>🌅 6AM</span>
      <span>☀️ 12PM</span>
      <span>🌇 6PM</span>
      <span>🌙 12AM</span>
    </div>
  </div>

  <div class="phases-grid" id="phasesGrid"></div>

  <div class="button-row">
    <button class="btn btn-secondary" id="resetBtn">Reset to Defaults</button>
    <button class="btn btn-primary" id="saveBtn">Save Colors</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const phases = [
      { id: 'night', name: 'Night', emoji: '🌙', time: '8PM - 5AM' },
      { id: 'preDawn', name: 'Pre-Dawn', emoji: '🌌', time: '5AM - 6AM' },
      { id: 'dawn', name: 'Dawn', emoji: '🌅', time: '6AM - 6:30AM' },
      { id: 'sunrise', name: 'Sunrise', emoji: '🌄', time: '6:30AM - 8AM' },
      { id: 'morning', name: 'Morning', emoji: '☀️', time: '8AM - 11AM' },
      { id: 'midday', name: 'Midday', emoji: '🌞', time: '11AM - 2PM' },
      { id: 'afternoon', name: 'Afternoon', emoji: '⛅', time: '2PM - 5PM' },
      { id: 'goldenHour', name: 'Golden Hour', emoji: '🌇', time: '5PM - 6PM' },
      { id: 'sunset', name: 'Sunset', emoji: '🌆', time: '6PM - 7PM' },
      { id: 'dusk', name: 'Dusk', emoji: '🌃', time: '7PM - 8PM' },
    ];

    const defaultPalettes = {
      night: { bg: '#1a1d24', fg: '#c0c5ce', accent: '#4a5568' },
      preDawn: { bg: '#1c1a24', fg: '#c0c5ce', accent: '#5a5170' },
      dawn: { bg: '#211e1a', fg: '#c0c5ce', accent: '#8b7355' },
      sunrise: { bg: '#232019', fg: '#c0c5ce', accent: '#9a8560' },
      morning: { bg: '#201f1c', fg: '#c0c5ce', accent: '#6b6560' },
      midday: { bg: '#1e1e1e', fg: '#c0c5ce', accent: '#606060' },
      afternoon: { bg: '#1b1d20', fg: '#c0c5ce', accent: '#556070' },
      goldenHour: { bg: '#241f18', fg: '#c0c5ce', accent: '#a08050' },
      sunset: { bg: '#221a1e', fg: '#c0c5ce', accent: '#8a6070' },
      dusk: { bg: '#1e1a24', fg: '#c0c5ce', accent: '#705880' },
    };

    let currentPalettes = JSON.parse(JSON.stringify(defaultPalettes));
    let basePalettes = JSON.parse(JSON.stringify(defaultPalettes));
    let selectedPhase = null;
    let intensity = 50;

    // Color manipulation functions
    function hexToHsl(hex) {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToHex(h, s, l) {
      s /= 100;
      l /= 100;
      const a = s * Math.min(l, 1 - l);
      const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return \`#\${f(0)}\${f(8)}\${f(4)}\`;
    }

    function adjustIntensity(hex, intensityPercent) {
      const hsl = hexToHsl(hex);
      // 25% = no change, 0% = muted, 50% = +20% vivid, 100% = very vivid
      // Shifted so middle (50%) is more vivid by default
      const satAdjust = (intensityPercent - 25) * 0.8; // -20% to +60% saturation shift
      const newSat = Math.max(0, Math.min(100, hsl.s + satAdjust));
      return hslToHex(hsl.h, newSat, hsl.l);
    }

    function applyIntensity() {
      Object.keys(basePalettes).forEach(phase => {
        currentPalettes[phase] = {
          bg: adjustIntensity(basePalettes[phase].bg, intensity),
          fg: adjustIntensity(basePalettes[phase].fg, intensity),
          accent: adjustIntensity(basePalettes[phase].accent, intensity),
        };
      });
      renderTimeline();
      renderPhaseCards();
      
      vscode.postMessage({
        command: 'intensityChanged',
        intensity: intensity,
        colors: currentPalettes
      });
    }

    function renderTimeline() {
      const timeline = document.getElementById('timeline');
      timeline.innerHTML = phases.map(phase => {
        const palette = currentPalettes[phase.id];
        return \`<div class="timeline-segment" 
          style="background: linear-gradient(180deg, \${palette.accent}, \${palette.bg})"
          data-phase="\${phase.id}"
          title="\${phase.name}">\${phase.emoji}</div>\`;
      }).join('');
    }

    function renderPhaseCards() {
      const grid = document.getElementById('phasesGrid');
      grid.innerHTML = phases.map(phase => {
        const palette = currentPalettes[phase.id];
        return \`
          <div class="phase-card" data-phase="\${phase.id}">
            <div class="phase-header">
              <span class="phase-emoji">\${phase.emoji}</span>
              <span class="phase-name">\${phase.name}</span>
              <span class="phase-time">\${phase.time}</span>
            </div>
            
            <div class="color-row">
              <span class="color-label">Background</span>
              <div class="color-picker-wrapper" style="background: \${palette.bg}">
                <input type="color" class="color-picker" value="\${palette.bg}" 
                  data-phase="\${phase.id}" data-prop="bg">
              </div>
              <input type="text" class="color-hex" value="\${palette.bg}" 
                data-phase="\${phase.id}" data-prop="bg">
            </div>
            
            <div class="color-row">
              <span class="color-label">Text</span>
              <div class="color-picker-wrapper" style="background: \${palette.fg}">
                <input type="color" class="color-picker" value="\${palette.fg}" 
                  data-phase="\${phase.id}" data-prop="fg">
              </div>
              <input type="text" class="color-hex" value="\${palette.fg}" 
                data-phase="\${phase.id}" data-prop="fg">
            </div>
            
            <div class="color-row">
              <span class="color-label">Accent</span>
              <div class="color-picker-wrapper" style="background: \${palette.accent}">
                <input type="color" class="color-picker" value="\${palette.accent}" 
                  data-phase="\${phase.id}" data-prop="accent">
              </div>
              <input type="text" class="color-hex" value="\${palette.accent}" 
                data-phase="\${phase.id}" data-prop="accent">
            </div>
            
            <div class="preview-box" style="background: \${palette.bg}; color: \${palette.fg}; border: 2px solid \${palette.accent}">
              Preview text with accent border
            </div>
            
            <button class="preview-btn" data-phase="\${phase.id}">
              👁️ Preview in Editor
            </button>
          </div>
        \`;
      }).join('');
      
      // Add click handlers for preview buttons
      document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const phase = e.currentTarget.dataset.phase;
          console.log('Preview button clicked, phase:', phase);
          previewPhase(phase);
        });
      });
    }
    
    function previewPhase(phaseId) {
      console.log('previewPhase called with:', phaseId);
      
      if (!phaseId) {
        console.error('No phaseId provided');
        return;
      }
      
      // Update selected state
      selectedPhase = phaseId;
      document.querySelectorAll('.phase-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.phase === phaseId) {
          card.classList.add('selected');
        }
      });
      
      // Send preview command to extension
      const palette = currentPalettes[phaseId];
      console.log('Sending palette:', palette);
      
      if (!palette) {
        console.error('No palette found for phase:', phaseId);
        return;
      }
      
      vscode.postMessage({
        command: 'previewPhase',
        phase: phaseId,
        colors: palette
      });
      console.log('Message sent to extension');
    }

    function updateColor(phase, prop, value) {
      currentPalettes[phase][prop] = value;
      renderTimeline();
      renderPhaseCards();
      
      vscode.postMessage({
        command: 'colorsChanged',
        colors: currentPalettes
      });
    }

    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('color-picker') || e.target.classList.contains('color-hex')) {
        const phase = e.target.dataset.phase;
        const prop = e.target.dataset.prop;
        let value = e.target.value;
        
        // Validate hex format
        if (e.target.classList.contains('color-hex')) {
          if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return;
        }
        
        updateColor(phase, prop, value);
      }
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      vscode.postMessage({
        command: 'saveColors',
        colors: currentPalettes
      });
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      currentPalettes = JSON.parse(JSON.stringify(defaultPalettes));
      basePalettes = JSON.parse(JSON.stringify(defaultPalettes));
      intensity = 0;
      document.getElementById('intensitySlider').value = 0;
      document.getElementById('intensityValue').textContent = '0%';
      renderTimeline();
      renderPhaseCards();
      vscode.postMessage({
        command: 'resetColors'
      });
    });

    // Intensity slider
    document.getElementById('intensitySlider').addEventListener('input', (e) => {
      intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = intensity + '%';
      applyIntensity();
    });

    // Time preview slider
    // Time phases with times in minutes for interpolation
    const timePhasesList = [
      { time: 0, id: 'night' },      // 12AM
      { time: 240, id: 'night' },    // 4AM
      { time: 300, id: 'preDawn' },  // 5AM
      { time: 360, id: 'dawn' },     // 6AM
      { time: 390, id: 'sunrise' },  // 6:30AM
      { time: 480, id: 'morning' },  // 8AM
      { time: 660, id: 'midday' },   // 11AM
      { time: 780, id: 'midday' },   // 1PM
      { time: 900, id: 'afternoon' },// 3PM
      { time: 1020, id: 'goldenHour' }, // 5PM
      { time: 1080, id: 'sunset' },  // 6PM
      { time: 1140, id: 'dusk' },    // 7PM
      { time: 1200, id: 'night' },   // 8PM
      { time: 1440, id: 'night' },   // 12AM
    ];

    // Lerp between two hex colors
    function lerpColor(color1, color2, t) {
      const c1 = {
        r: parseInt(color1.slice(1, 3), 16),
        g: parseInt(color1.slice(3, 5), 16),
        b: parseInt(color1.slice(5, 7), 16)
      };
      const c2 = {
        r: parseInt(color2.slice(1, 3), 16),
        g: parseInt(color2.slice(3, 5), 16),
        b: parseInt(color2.slice(5, 7), 16)
      };
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    // Get interpolated palette for a given time in minutes
    function getInterpolatedPalette(minutes) {
      let prevPhase = timePhasesList[0];
      let nextPhase = timePhasesList[1];
      
      for (let i = 0; i < timePhasesList.length - 1; i++) {
        if (minutes >= timePhasesList[i].time && minutes < timePhasesList[i + 1].time) {
          prevPhase = timePhasesList[i];
          nextPhase = timePhasesList[i + 1];
          break;
        }
      }
      
      // Calculate interpolation factor
      const range = nextPhase.time - prevPhase.time;
      const t = range > 0 ? (minutes - prevPhase.time) / range : 0;
      
      const palette1 = currentPalettes[prevPhase.id];
      const palette2 = currentPalettes[nextPhase.id];
      
      return {
        bg: lerpColor(palette1.bg, palette2.bg, t),
        fg: lerpColor(palette1.fg, palette2.fg, t),
        accent: lerpColor(palette1.accent, palette2.accent, t),
        currentPhase: t < 0.5 ? prevPhase.id : nextPhase.id
      };
    }

    function formatTime(minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return displayHours + ':' + mins.toString().padStart(2, '0') + ' ' + ampm;
    }

    function getPhaseEmoji(phaseId) {
      const emojis = {
        night: '🌙', preDawn: '🌌', dawn: '🌅', sunrise: '🌄',
        morning: '☀️', midday: '🌞', afternoon: '⛅',
        goldenHour: '🌇', sunset: '🌆', dusk: '🌃'
      };
      return emojis[phaseId] || '☀️';
    }

    document.getElementById('timeSlider').addEventListener('input', (e) => {
      const minutes = parseInt(e.target.value);
      const interpolated = getInterpolatedPalette(minutes);
      const emoji = getPhaseEmoji(interpolated.currentPhase);
      document.getElementById('timeValue').textContent = emoji + ' ' + formatTime(minutes);
      
      // Highlight the current phase card
      document.querySelectorAll('.phase-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.phase === interpolated.currentPhase) {
          card.classList.add('selected');
        }
      });

      // Send interpolated preview to editor
      vscode.postMessage({
        command: 'previewPhase',
        phase: interpolated.currentPhase,
        colors: {
          bg: interpolated.bg,
          fg: interpolated.fg,
          accent: interpolated.accent
        }
      });
    });

    // Initial render
    renderTimeline();
    renderPhaseCards();
  </script>
</body>
</html>
    `;
  }
}

