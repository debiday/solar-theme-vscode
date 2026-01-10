# ☀️ Solar Theme

> **A dynamic VS Code/Cursor theme that shifts colors from sunrise to sunset**

Solar Theme smoothly transitions your editor's colors throughout the day based on the sun's position at your location. Warm amber mornings, bright afternoons, golden evenings, and deep indigo nights—all automatic.

![Solar Theme Demo](images/demo.gif)

## ✨ Features

- 🎨 **Dynamic color transitions** - editor background, sidebar, terminal, and UI shift smoothly
- 📍 **Auto-detects location** - uses IP geolocation on first run, or set manually
- ⚙️ **Settings panel** - preview any time of day and adjust color intensity
- 🌈 **Cohesive syntax theme** - muted, earthy tones that work across all phases
- 📊 **Status bar** - shows current sun phase at a glance

## 📦 Installation

### Manual Installation

```bash
git clone https://github.com/yourusername/solar-theme-vscode.git
cd solar-theme-vscode
npm install
npm run compile
npx vsce package --no-dependencies
code --install-extension solar-theme-0.1.0.vsix
```

## 🚀 Quick Start

1. Install the extension
2. Your location is auto-detected on first run (you'll see a notification)
3. Open Command Palette → **Solar Theme: Open Color Settings Panel** to preview and customize

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `solarTheme.enabled` | `true` | Enable/disable automatic color updates |
| `solarTheme.latitude` | `30.35` | Your latitude |
| `solarTheme.longitude` | `-97.74` | Your longitude |
| `solarTheme.intensity` | `100` | Color intensity (0 = muted, 100 = vivid) |
| `solarTheme.updateIntervalSeconds` | `5` | Update frequency in seconds |

### Location

**Auto-detection**: On first run, your location is detected via IP geolocation (~city accuracy).

**Manual override**: For exact coordinates, go to [Google Maps](https://maps.google.com), right-click your location, and copy the coordinates.

## 🖥️ Commands

| Command | Description |
|---------|-------------|
| `Solar Theme: Open Color Settings Panel` | Preview times and adjust settings |
| `Solar Theme: Update Theme Now` | Force immediate color update |
| `Solar Theme: Show Sunrise/Sunset Times` | Display sun times for your location |
| `Solar Theme: Toggle Enabled` | Enable/disable the extension |
| `Solar Theme: Reset Colors to Default` | Reset to current time-based colors |

## 🌅 Time Phases

| Phase | Time | Colors |
|-------|------|--------|
| 🌅 Dawn | Before sunrise | Warm amber, soft orange |
| ☀️ Morning | Sunrise to noon | Bright warm tones |
| 🌤️ Afternoon | Noon to sunset | Neutral, balanced |
| 🌇 Golden Hour | Around sunset | Golden, warm |
| 🌆 Dusk | After sunset | Purple, magenta |
| 🌙 Night | After dusk | Deep indigo, blue |

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- [SunCalc](https://github.com/mourner/suncalc) - Sun position calculations

---

**Code with the rhythm of the sun 🌞🌙**
