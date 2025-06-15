# AWS AlwaysON Options Configuration

This document explains how to modify the extension options menu using the new configuration system.

## Overview

The options page has been refactored to use a modern UI with Tailwind CSS and a centralized configuration system. All menu structure, form fields, and help text are now defined in `menu-config.js`.

## Configuration File: `menu-config.js`

The configuration file contains a `MENU_CONFIG` object with the following structure:

### Tabs Configuration
```javascript
tabs: [
  {
    id: "options_main",
    label: "General",
    active: true
  },
  // ... more tabs
]
```

### Sections Configuration
Each tab has a corresponding section with form fields:

```javascript
sections: {
  options_main: [
    {
      type: "text",           // Field type: "text", "select", or "checkbox"
      id: "platform",         // Unique field ID (used for storage)
      label: "OS platform",   // Display label
      placeholder: "e.g., windows", // Placeholder text
      helpText: "Help text..." // Tooltip help text
    }
  ]
}
```

## Field Types

### Text Input
```javascript
{
  type: "text",
  id: "field_id",
  label: "Field Label",
  placeholder: "Placeholder text",
  helpText: "Help text for tooltip"
}
```

### Select Dropdown
```javascript
{
  type: "select",
  id: "field_id",
  label: "Field Label",
  options: [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" }
  ],
  helpText: "Help text for tooltip"
}
```

### Checkbox
```javascript
{
  type: "checkbox",
  id: "field_id",
  label: "Checkbox Label",
  helpText: "Help text for tooltip"
}
```

## Adding New Options

1. **Add a new tab** (if needed):
   ```javascript
   {
     id: "options_newtab",
     label: "New Tab",
     active: false
   }
   ```

2. **Add the corresponding section**:
   ```javascript
   options_newtab: [
     {
       type: "text",
       id: "new_field",
       label: "New Field",
       placeholder: "Enter value",
       helpText: "Help text"
     }
   ]
   ```

3. **The system automatically handles**:
   - Form rendering
   - Data saving/loading
   - Validation (if needed)
   - Tooltips
   - Styling

## Removing Options

Simply remove the field definition from the appropriate section in `menu-config.js`. The system will automatically update the UI.

## Features

- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Auto-save**: Settings are saved automatically when changed
- **Tooltips**: Hover help text for each field
- **Toast notifications**: Success/error feedback
- **Permission handling**: Automatic permission requests for AWS SSO
- **Responsive**: Works on different screen sizes

## File Structure

- `options.html` - Main HTML structure
- `options.js` - JavaScript logic and event handling
- `menu-config.js` - Configuration for all menu items
- `README-OPTIONS.md` - This documentation

## Browser Compatibility

The extension maintains compatibility with both Chrome and Firefox through the `getApi()` function that detects the appropriate browser API. 