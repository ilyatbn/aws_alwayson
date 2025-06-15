// Chrome extension compatibility
let storage;
let api;

function getApi() {
  if (typeof chrome !== "undefined") {
    if (typeof browser !== "undefined") {
      return browser;
    } else {
      return chrome;
    }
  }
  return null;
}

// Initialize API and storage
function initializeAPI() {
  api = getApi();
  if (api && api.storage) {
    storage = api.storage.local;
    debug('Chrome extension API initialized');
    return true;
  } else {
    debug('Chrome extension API not available');
    return false;
  }
}

// Debug function
function debug(message, data = null) {
  console.log(`[AWS AlwaysON Menu] ${message}`, data);
}

// Initialize the application
$(document).ready(function() {
  debug('Document ready, initializing...');
  
  // Initialize API
  initializeAPI();
  
  // Check if MENU_CONFIG is available
  if (typeof MENU_CONFIG === 'undefined') {
    debug('ERROR: MENU_CONFIG not found!');
    showError('Configuration not loaded. Please refresh the page.');
    return;
  }
  
  debug('MENU_CONFIG loaded successfully');
  
  try {
    main();
    setupEventListeners();
    debug('Initialization complete');
  } catch (error) {
    debug('Error during initialization:', error);
    showError('Failed to initialize menu: ' + error.message);
  }
});

function showError(message) {
  const errorBar = $('#msg');
  errorBar.text(message).removeClass('hidden');
}

function hideError() {
  $('#msg').addClass('hidden');
}

// Options button click handler
function setupEventListeners() {
  debug('Setting up event listeners...');
  
  // Options button
  $('#go-to-options').click(function() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
  
  // Autofill button
  $('#autofill-btn').click(function() {
    const isEnabled = $(this).hasClass('enabled');
    if (!isEnabled) {
      storage.set({"autofill": 1});
      $(this).addClass('enabled');
      refreshRolesBackend();
    } else {
      storage.set({"autofill": 0});
      $(this).removeClass('enabled');
      location.reload();
    }
  });
  
  debug('Event listeners set up');
}

function handleTextboxes(props) {
  debug('Handling textboxes...');
  
  $("input[id^='role']").each(function() {
    const input = $(this);
    const isReadonly = input.prop("readonly");
    
    if (isReadonly) {
      input.addClass('bg-gray-200');
    } else {
      input.removeClass('bg-gray-200');
    }
    
    const id = input.attr("id");
    if (typeof props[id] !== 'undefined') {
      input.val(props[id]);
    }
  });
}

function setStsButton(button, props) {
  const btn = $(button);
  
  if (props.last_msg && props.last_msg.includes('err')) {
    btn.css("background-image", "url(/img/err.png)");
    btn.removeClass('hidden');
    btn.css("pointer-events", "none");
    showError(props.last_msg_detail);
  } else {
    btn.removeClass('hidden');
    btn.css("pointer-events", "auto");
  }
}

function setConsoleButton(button, props) {
  const btn = $(button);
  
  if (props.last_msg && props.last_msg.includes('err')) {
    btn.addClass('hidden');
    btn.css("pointer-events", "none");
  } else {
    btn.removeClass('hidden');
    btn.css("pointer-events", "auto");
  }
}

function populateCheckboxesAndButtons(props) {
  debug('Populating checkboxes and buttons...');
  
  if (typeof props.checked !== 'undefined') {
    const dataIndex = $(`#${props.checked}`).attr("data-index");
    
    // Set the checkbox as checked
    $(`input[id^='enable'][type='checkbox'][data-index=${dataIndex}]`).prop("checked", true);
    
    if (props.idp_type === "awssso") {
      // In AWS SSO, enable all buttons
      $('[id^="sts_button"]').each(function() {
        setStsButton(this, props);
      });
      $('[id^="console_btn"]').each(function() {
        setConsoleButton(this, props);
      });
    } else {
      // Enable only the relevant STS button
      $(`[id^="sts_button"][data-index=${dataIndex}]`).each(function() {
        setStsButton(this, props);
      });
    }
  }
  
  // Handle autofill state
  if (props.autofill == 1) {
    $('#autofill-btn').addClass('enabled');
  }
}

async function exportStsToClipboard(platform, credentials) {
  let stsCommand;
  switch (platform.toLowerCase()) {
    case 'windows':
    case 'win32':
      stsCommand = "set";
      break;
    default:
      stsCommand = "export";
  }
  
  const stscli = [
    `${stsCommand} AWS_ACCESS_KEY_ID=${credentials.awsAccessKeyId || credentials.accessKeyId}`,
    `${stsCommand} AWS_SECRET_ACCESS_KEY=${credentials.awsSecretAccessKey || credentials.secretAccessKey}`,
    `${stsCommand} AWS_SESSION_TOKEN=${credentials.awsSessionToken || credentials.sessionToken}`,
    `${stsCommand} AWS_SESSION_EXPIRATION=${credentials.awsExpiration || credentials.expiration}`,
  ];
  
  try {
    await navigator.clipboard.writeText(stscli.join("&&"));
    alert("Token copied to clipboard");
  } catch (error) {
    alert("Failed copying to clipboard");
    debug('Clipboard error:', error);
  }
}

async function refreshRolesBackend() {
  debug('Refreshing roles backend...');
  
  const port = chrome.runtime.connect({
    name: "talk to background.js"
  });
  
  port.postMessage('role_refresh');
  port.onMessage.addListener(function(msg) {
    if (msg === 'roles_refreshed') {
      location.reload();
    } else if (msg.includes('err')) {
      storage.get(['last_msg_detail'], function(result) {
        showError(result.last_msg_detail);
      });
    } else {
      debug("Service worker response:", msg);
    }
  });
}

function buildMenu(props) {
  debug('Building menu...');
  
  const roleGrid = $('#role-grid');
  roleGrid.empty();
  
  const roleCount = parseInt(props.roleCount) || MENU_CONFIG.menu.ui.defaultRoleCount;
  
  for (let i = 0; i < roleCount; i++) {
    const roleItem = $(`
      <div class="bg-white/90 p-2 flex items-center justify-between" data-index="${i}">
        <div class="flex items-center space-x-2 flex-1">
          <input type="text" 
                 id="role${i}" 
                 class="role-input" 
                 placeholder="Role" 
                 data-index="${i}"
                 ${props.autofill == 1 ? 'readonly' : ''}>
          
          <button class="action-button sts-button hidden" 
                  id="sts_button${i}" 
                  data-index="${i}" 
                  title="Click to copy STS credentials to clipboard"></button>
          
          <button class="action-button console-button hidden" 
                  id="console_btn${i}" 
                  data-index="${i}" 
                  title="Open AWS Console"></button>
        </div>
        
        <label class="toggle-switch ml-2">
          <input type="checkbox" id="enable${i}" data-index="${i}">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `);
    
    roleGrid.append(roleItem);
  }
  
  handleTextboxes(props);
  populateCheckboxesAndButtons(props);
  setupRoleEventListeners(props);
}

function setupRoleEventListeners(props) {
  debug('Setting up role event listeners...');
  
  // Role input focus - uncheck all checkboxes
  $("input[id^='role']").focus(function() {
    $("input[id^='enable'][type='checkbox']").prop("checked", false);
    
    const port = chrome.runtime.connect({
      name: "talk to background.js"
    });
    port.postMessage('refreshoff');
  });
  
  // Role input focusout - save to storage
  $("input[id^='role']").focusout(function() {
    const roleName = $(this).attr("id");
    const roleValue = $(this).val();
    const obj = { [roleName]: roleValue };
    storage.set(obj);
  });
  
  // Console button click
  $('[id^="console_btn"]').click(async function() {
    const index = $(this).attr("data-index");
    
    if (props.idp_type === "awssso") {
      const accountId = props[`role${index}_acc`];
      const role = props[`role${index}_name`];
      const targetUrl = MENU_CONFIG.menu.idpBehavior.awssso.consoleUrlTemplate
        .replace('{accountId}', accountId)
        .replace('{roleName}', role);
      
      api.tabs.create({ url: targetUrl, active: true });
    }
  });
  
  // STS button click
  $('[id^="sts_button"]').click(async function() {
    const index = $(this).attr("data-index");
    
    if (props.idp_type === "awssso") {
      const accountId = props[`role${index}_acc`];
      const role = props[`role${index}_name`];
      const region = props.amz_rgn;
      const headers = props.amz_hdr;
      
      const baseUrl = MENU_CONFIG.menu.idpBehavior.awssso.federationUrlTemplate
        .replace('{accountId}', accountId)
        .replace('{roleName}', role)
        .replace('{region}', region);
      
      try {
        const credsResponse = await fetch(baseUrl, {
          method: "GET",
          headers: headers
        });
        
        const creds = await credsResponse.json();
        
        if (credsResponse.ok) {
          exportStsToClipboard(props.platform, creds.roleCredentials);
        } else {
          debug(`Federation endpoint error: ${creds.message}`);
          refreshRolesBackend();
        }
      } catch (error) {
        debug('Fetch error:', error);
        refreshRolesBackend();
      }
    } else {
      if ($(`#enable${index}`).prop("checked")) {
        storage.get(["platform", "awsAccessKeyId", "awsSecretAccessKey", "awsSessionToken", "awsExpiration"], function(data) {
          exportStsToClipboard(data.platform, data);
        });
      }
    }
  });
  
  // Checkbox change
  $("input[id^='enable'][type='checkbox']").change(function() {
    hideError();
    
    const id = $(this).attr("id");
    const dataIndex = $(this).attr("data-index");
    
    if (props.idp_type === "awssso") {
      // In AWS SSO, we don't hide anything since they are all available
    } else {
      // Hide all STS buttons
      $("[id^='sts_button']").addClass('hidden');
    }
    
    if (!this.checked) {
      const port = chrome.runtime.connect({
        name: "talk to background.js"
      });
      port.postMessage('refreshoff');
    } else {
      // Uncheck other checkboxes
      $("input[id^='enable'][type='checkbox']").each(function() {
        if ($(this).attr("id") !== id) {
          $(this).prop("checked", false);
        }
      });
      
      // Enable STS loading button
      $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function() {
        $(this).css("background-image", "url(/img/loading.gif)");
        $(this).removeClass('hidden');
        $(this).css("pointer-events", "none");
      });
      
      // Set the role textbox as checked
      $(`input[id^='role'][data-index=${dataIndex}]`).each(function() {
        storage.set({ 'checked': $(this).attr("id") });
      });
      
      // Start background service
      const port = chrome.runtime.connect({
        name: "talk to background.js"
      });
      
      port.postMessage("refreshon");
      port.onMessage.addListener(function(msg) {
        if (msg === 'sts_ready') {
          $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function() {
            $(this).css("background-image", "url(/img/cli.png)");
            $(this).prop("title", "Click to copy STS credentials to clipboard.");
            $(this).css("pointer-events", "auto");
          });
        } else if (msg.includes('err')) {
          $(`[id^='sts_button'][data-index=${dataIndex}]`).each(function() {
            $(this).css("background-image", "url(/img/err.png)");
            storage.get(['last_msg_detail'], function(result) {
              showError(result.last_msg_detail);
            });
          });
        } else {
          debug("Service worker response:", msg);
        }
      });
    }
  });
}

async function main() {
  debug('Starting main function...');
  
  let props = await storage.get(null);
  
  // Set default values if undefined or empty
  Object.keys(MENU_CONFIG.menu.defaults).forEach(function(item) {
    if (!(item in props) || props[item] === undefined || props[item] === "") {
      storage.set({ [item]: MENU_CONFIG.menu.defaults[item] });
    }
  });
  
  // Refresh props after setting defaults
  props = await storage.get(null);
  
  if (props.roleCount === undefined) {
    storage.set({ 'roleCount': MENU_CONFIG.menu.ui.defaultRoleCount });
    $('#go-to-options').click();
    return;
  }
  
  buildMenu(props);
  
  // CLI button hover tooltip
  $("#sts_button").hover(function() {
    alert($(this).prop("title"));
  });
  
  debug('Main function completed');
}
