exports.repo = "Hug3O/Hotkey"
exports.version = 1.0
exports.apiRequired = 8.87
exports.hasConfig = true
exports.frontend_js = 'main.js'
exports.description = "Unified keyboard hotkey helper for HFS (Enter/Esc + file-show shortcuts)"

exports.config = {

    enabled: {
        type: 'boolean',
        label: 'Enable Hotkey',
        defaultValue: true,
        helperText: `
Unified keyboard helper.

Dialog keys:
  Enter      Confirm (OK / Continue)
  Escape     Cancel / close
  Backspace  Cancel (when not typing)

File-show keys (preview open):
  M  Menu       C  Comment    O  Open      D  Download
  X  Cut        R  Rename     Del Delete   Z  Zoom
  F  Fullscreen S  Shuffle    P  Repeat    L  Copy link

Shortcuts are ignored while typing in an input field.
When disabled, no hotkey will be triggered.
        `
    }

}