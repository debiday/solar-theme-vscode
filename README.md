# ☀️ Solar Theme

> **Dynamically change your VS Code/Cursor theme from sunrise to sunset**

Solar Theme automatically switches your editor's color theme based on the sun's position at your location. Wake up to a gentle light theme, work through the day, and transition to a dark theme as the sun sets.

![Solar Theme Demo](images/demo.gif)

## ✨ Features

- 🌅 **Automatic theme switching** based on real sunrise/sunset times
- 📍 **Location-based** - uses your latitude/longitude for accurate sun times
- 🌇 **Optional dawn/dusk themes** - add intermediate themes for golden hour
- ⚡ **Lightweight** - minimal CPU usage with configurable update intervals
- 🔔 **Optional notifications** - get notified when themes change
- 📊 **Status bar indicator** - shows current sun phase at a glance

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code/Cursor
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "Solar Theme"
4. Click Install

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/solar-theme-vscode.git
cd solar-theme-vscode

# Install dependencies
npm install

# Compile
npm run compile

# Package the extension
npm run package

# Install the .vsix file
code --install-extension solar-theme-0.1.0.vsix
```

## ⚙️ Configuration

Open Settings (`Cmd+,` / `Ctrl+,`) and search for "Solar Theme":

| Setting | Default | Description |
|---------|---------|-------------|
| `solarTheme.enabled` | `true` | Enable/disable automatic theme switching |
| `solarTheme.latitude` | `40.7128` | Your latitude (NYC default) |
| `solarTheme.longitude` | `-74.006` | Your longitude (NYC default) |
| `solarTheme.dayTheme` | `Default Light Modern` | Theme to use during daytime |
| `solarTheme.nightTheme` | `Default Dark Modern` | Theme to use at night |
| `solarTheme.dawnTheme` | `""` | Optional theme for dawn (before sunrise) |
| `solarTheme.duskTheme` | `""` | Optional theme for dusk (after sunset) |
| `solarTheme.dawnDurationMinutes` | `30` | How long before sunrise to start dawn |
| `solarTheme.duskDurationMinutes` | `60` | How long after sunset for dusk (golden hour) |
| `solarTheme.updateIntervalSeconds` | `60` | How often to check for theme updates |
| `solarTheme.showNotifications` | `false` | Show notification when theme changes |

### Finding Your Coordinates

1. Go to [Google Maps](https://maps.google.com)
2. Right-click on your location
3. Click the coordinates to copy them
4. Paste into settings (latitude first, then longitude)

Example for San Francisco:
```json
{
  "solarTheme.latitude": 37.7749,
  "solarTheme.longitude": -122.4194
}
```

### Example Configuration

```json
{
  "solarTheme.enabled": true,
  "solarTheme.latitude": 51.5074,
  "solarTheme.longitude": -0.1278,
  "solarTheme.dayTheme": "Solarized Light",
  "solarTheme.nightTheme": "One Dark Pro",
  "solarTheme.dawnTheme": "Quiet Light",
  "solarTheme.duskTheme": "Dracula Soft",
  "solarTheme.showNotifications": true
}
```

## 🎨 Recommended Theme Combinations

### Gentle Transition
- **Dawn**: Quiet Light
- **Day**: GitHub Light
- **Dusk**: Dracula Soft
- **Night**: One Dark Pro

### High Contrast
- **Day**: Default Light+
- **Night**: Default Dark+

### Solarized Flow
- **Day**: Solarized Light
- **Night**: Solarized Dark

### Cozy Developer
- **Dawn**: Ayu Light
- **Day**: Atom One Light
- **Dusk**: Tokyo Night Storm
- **Night**: Tokyo Night

## 🖥️ Commands

Access these commands via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | Description |
|---------|-------------|
| `Solar Theme: Update Theme Now` | Force an immediate theme update |
| `Solar Theme: Show Sunrise/Sunset Times` | Display sun times and current status |
| `Solar Theme: Toggle Enabled` | Enable/disable the extension |

## 📊 Status Bar

The status bar shows the current sun phase:
- 🌅 Dawn (before sunrise)
- ☀️ Day (sunrise to sunset)
- 🌇 Dusk (after sunset, golden hour)
- 🌙 Night (after dusk)

Click on it to see detailed sun times for your location.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [SunCalc](https://github.com/mourner/suncalc) - Sun position calculations
- Inspired by f.lux and macOS/Windows auto dark mode

---

**Enjoy coding with the rhythm of the sun! 🌞🌙**




