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
    // Mock storage for testing outside extension context
    debug('Chrome extension API not available, using mock storage');
    storage = {
      get: function(keys, callback) {
        const mockData = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            mockData[key] = localStorage.getItem(key) || '';
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(key => {
            mockData[key] = localStorage.getItem(key) || keys[key];
          });
        }
        callback(mockData);
      },
      set: function(items, callback) {
        Object.keys(items).forEach(key => {
          localStorage.setItem(key, items[key]);
        });
        if (callback) callback();
      }
    };
    return false;
  }
}

const awsSsoPermissions = {
  permissions: ["tabs", "windows"],
  origins: [
    "https://*.awsapps.com/*",
    "https://*.amazonaws.com/*"
  ]
};

// State management
let currentTab = 'options_main';
let tooltipTimeout = null;
let isExtensionContext = false;
let permissionValidationInProgress = {}; // Track ongoing permission validations

// Debug function
let debugEnabled = false;

// Initialize debug setting
async function initializeDebug() {
  try {
    const props = await storage.get(['debug_logging']);
    debugEnabled = props.debug_logging || false;
  } catch (error) {
    debugEnabled = false;
  }
}

function debug(message, data = null) {
  if (debugEnabled) {
    console.log(`[AWS AlwaysON Options] ${message}`, data);
  }
}

// Initialize the application
$(document).ready(async function() {
  debug('Document ready, initializing...');
  
  // Initialize API
  isExtensionContext = initializeAPI();
  
  // Initialize debug setting
  await initializeDebug();
  
  // Check if MENU_CONFIG is available
  if (typeof MENU_CONFIG === 'undefined') {
    debug('ERROR: MENU_CONFIG not found!');
    showError('Configuration not loaded. Please refresh the page.');
    return;
  }
  
  debug('MENU_CONFIG loaded successfully', MENU_CONFIG);
  
  try {
    initializeUI();
    loadOptions();
    setupEventListeners();
    debug('Initialization complete');
  } catch (error) {
    debug('Error during initialization:', error);
    showError('Failed to initialize options page: ' + error.message);
  }
});

function showError(message) {
  const contentSections = $('#content-sections');
  contentSections.html(`
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <div class="flex items-center">
        <svg class="w-6 h-6 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
        </svg>
        <h3 class="text-lg font-medium text-red-800">Error</h3>
      </div>
      <p class="mt-2 text-red-700">${message}</p>
    </div>
  `);
}

function initializeUI() {
  debug('Initializing UI...');
  renderTabs();
  renderContent();
  showTab(currentTab);
  debug('UI initialized');
}

function renderTabs() {
  debug('Rendering tabs...');
  const tabContainer = $('#tab-navigation');
  tabContainer.empty();
  
  MENU_CONFIG.tabs.forEach(tab => {
    const tabElement = $(`
      <button class="tab-button py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
        tab.active ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }" data-tab="${tab.id}">
        ${tab.label}
      </button>
    `);
    tabContainer.append(tabElement);
  });
  debug('Tabs rendered');
}

function renderContent() {
  debug('Rendering content sections...');
  const contentContainer = $('#content-sections');
  contentContainer.empty();
  
  Object.keys(MENU_CONFIG.sections).forEach(sectionId => {
    const section = MENU_CONFIG.sections[sectionId];
    debug(`Rendering section: ${sectionId}`, section);
    
    const sectionElement = $(`
      <div id="${sectionId}-content" class="tab-content hidden">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="space-y-6">
            ${section.map(field => renderField(field)).join('')}
          </div>
        </div>
      </div>
    `);
    contentContainer.append(sectionElement);
  });
  debug('Content sections rendered');
}

function renderField(field) {
  const fieldId = field.id;
  const helpIcon = `
    <button class="help-button ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors" 
            data-help="${field.helpText}" 
            title="Help">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
      </svg>
    </button>
  `;

  switch (field.type) {
    case 'text':
      return `
        <div class="field-group">
          <label for="${fieldId}" class="block text-sm font-medium text-gray-700 mb-2">
            ${field.label}
            ${helpIcon}
          </label>
          <input type="text" 
                 id="${fieldId}" 
                 class="form-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors" 
                 placeholder="${field.placeholder || ''}"
                 autocomplete="off">
        </div>
      `;
    
    case 'select':
      const options = field.options.map(option => 
        `<option value="${option.value}">${option.label}</option>`
      ).join('');
      
      return `
        <div class="field-group">
          <label for="${fieldId}" class="block text-sm font-medium text-gray-700 mb-2">
            ${field.label}
            ${helpIcon}
          </label>
          <select id="${fieldId}" 
                  class="form-select w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors">
            ${options}
          </select>
        </div>
      `;
    
    case 'checkbox':
      return `
        <div class="field-group">
          <div class="flex items-center">
            <input type="checkbox" 
                   id="${fieldId}" 
                   class="form-checkbox h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded transition-colors">
            <label for="${fieldId}" class="ml-3 block text-sm font-medium text-gray-700">
              ${field.label}
              ${helpIcon}
            </label>
          </div>
        </div>
      `;
    
    default:
      debug(`Unknown field type: ${field.type}`, field);
      return '';
  }
}

function showTab(tabId) {
  debug(`Showing tab: ${tabId}`);
  
  // Hide all content sections
  $('.tab-content').addClass('hidden');
  
  // Show selected content section
  const targetContent = $(`#${tabId}-content`);
  if (targetContent.length > 0) {
    targetContent.removeClass('hidden');
  } else {
    debug(`ERROR: Content section not found for tab: ${tabId}`);
  }
  
  // Update tab styling
  $('.tab-button').removeClass('border-orange-500 text-orange-600')
                  .addClass('border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
  
  $(`.tab-button[data-tab="${tabId}"]`).removeClass('border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
                                       .addClass('border-orange-500 text-orange-600');
  
  currentTab = tabId;
  debug(`Tab ${tabId} shown successfully`);
}

function setupEventListeners() {
  debug('Setting up event listeners...');
  
  // Tab switching
  $(document).on('click', '.tab-button', function() {
    const tabId = $(this).data('tab');
    debug(`Tab clicked: ${tabId}`);
    showTab(tabId);
  });
  
  // Form field changes - use 'change' event only to avoid duplicates
  $(document).on('change', '.form-input, .form-select, .form-checkbox', async function() {
    const fieldId = $(this).attr('id');
    let fieldValue = $(this).val();
    
    // Handle checkbox values
    if ($(this).attr('type') === 'checkbox') {
      fieldValue = $(this).prop('checked');
    }
    
    debug(`Field changed: ${fieldId} = ${fieldValue}`);
    await saveField(fieldId, fieldValue);
  });
  
  // Help tooltips - use mouseenter/mouseleave for better control
  $(document).on('mouseenter', '.help-button', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const helpText = $(this).data('help');
    if (helpText) {
      showTooltip(helpText, e);
    }
  });
  
  $(document).on('mouseleave', '.help-button', function(e) {
    e.preventDefault();
    e.stopPropagation();
    hideTooltip();
  });
  
  // Also handle tooltip on mouseleave from the tooltip itself
  $(document).on('mouseleave', '#tooltip-container', function() {
    hideTooltip();
  });
  
  debug('Event listeners set up');
}

function showTooltip(text, event) {
  if (!text) return;
  
  const tooltip = $('#tooltip-container');
  const tooltipContent = $('#tooltip-content');
  
  // Clear any existing timeout
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  
  tooltipContent.text(text);
  
  // Position tooltip
  const rect = event.target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate position
  let left = rect.right + 10;
  let top = rect.top - 5;
  
  // Ensure tooltip doesn't go off-screen
  if (left + 250 > viewportWidth) {
    left = rect.left - 260; // Position to the left of the button
  }
  
  if (top + 100 > viewportHeight) {
    top = viewportHeight - 110; // Position above bottom of viewport
  }
  
  tooltip.css({
    left: left + 'px',
    top: top + 'px',
    display: 'block',
    opacity: '1',
    visibility: 'visible'
  });
  
  debug(`Tooltip shown: ${text}`);
}

function hideTooltip() {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
  }
  
  tooltipTimeout = setTimeout(() => {
    const tooltip = $('#tooltip-container');
    tooltip.css({
      display: 'none',
      opacity: '0',
      visibility: 'hidden'
    });
    debug('Tooltip hidden');
  }, 100);
}

async function saveField(fieldId, fieldValue) {
  try {
    debug(`Saving field: ${fieldId} = ${fieldValue}`);
    
    // Only validate permissions in extension context
    let validated = true;
    if (isExtensionContext) {
      validated = await permissionValidator(fieldId, fieldValue);
    }
    
    if (validated) {
      const obj = { [fieldId]: fieldValue };
      await storage.set(obj);
      showToast('Setting saved successfully!', 'success');
      debug(`Field saved successfully: ${fieldId}`);
      
      // Update debug setting if debug_logging field was changed
      if (fieldId === 'debug_logging') {
        await updateDebugSetting();
      }
    } else {
      showToast('Permission validation failed', 'error');
      debug(`Permission validation failed for: ${fieldId}`);
    }
  } catch (error) {
    console.error('Error saving field:', error);
    showToast('Error saving setting', 'error');
    debug(`Error saving field ${fieldId}:`, error);
  }
}

function showToast(message, type = 'success') {
  const toast = $('#toast');
  const toastMessage = $('#toast-message');
  const toastContent = toast.find('div');
  
  // Update message and styling
  toastMessage.text(message);
  
  if (type === 'error') {
    toastContent.removeClass('bg-green-500').addClass('bg-red-500');
  } else {
    toastContent.removeClass('bg-red-500').addClass('bg-green-500');
  }
  
  // Show toast
  toast.removeClass('translate-x-full');
  
  // Hide after 3 seconds
  setTimeout(() => {
    toast.addClass('translate-x-full');
  }, 3000);
}

async function permissionValidator(option, value) {
  if (!isExtensionContext) {
    debug('Not in extension context, skipping permission validation');
    return true;
  }
  
  // Check if validation is already in progress for this option
  if (permissionValidationInProgress[option]) {
    debug(`Permission validation already in progress for: ${option}`);
    return true; // Return true to avoid blocking, the ongoing validation will handle it
  }
  
  let props = await storage.get(null);
  debug(`Validating option: ${option} = ${value}`);
  
  if (option === "saml_idp_domain") {
    // Revoke previous IDP domain permissions if different from current
    if (props.saml_idp_domain && props.saml_idp_domain !== value) {
      debug(`Revoking permissions for previous IDP domain: ${props.saml_idp_domain}`);
      const previousIdpPermission = {
        origins: [`https://${props.saml_idp_domain}/*`]
      };
      
      try {
        await new Promise((resolve) => {
          // Check if the permission is actually granted before trying to revoke
          api.permissions.contains(previousIdpPermission, (hasPermission) => {
            if (hasPermission) {
              api.permissions.remove(previousIdpPermission, (removed) => {
                if (removed) {
                  debug(`Successfully revoked permissions for ${props.saml_idp_domain}`);
                } else {
                  debug(`Failed to revoke permissions for ${props.saml_idp_domain}`);
                }
                resolve();
              });
            } else {
              debug(`Permissions for ${props.saml_idp_domain} not granted, skipping revocation`);
              resolve();
            }
          });
        });
      } catch (error) {
        debug(`Error revoking permissions for ${props.saml_idp_domain}:`, error);
      }
    }
    
    // Only request permissions if the value is not empty and different from current
    if (value && value !== '' && props.saml_idp_domain !== value) {
      debug(`Updated IDP domain, requesting permissions for ${value}`);
      permissionValidationInProgress[option] = true;
      
      const extraIdpPermission = {
        origins: [`https://${value}/*`]
      };
      
      return new Promise((resolve) => {
        api.permissions.contains(extraIdpPermission, (result) => {
          if (result) {
            debug("Permissions already granted.");
            permissionValidationInProgress[option] = false;
            resolve(true);
          } else {
            api.permissions.request(extraIdpPermission, (granted) => {
              if (granted) {
                debug(`User granted permissions for domain ${value}`);
                permissionValidationInProgress[option] = false;
                resolve(true);
              } else {
                debug(`User did not grant permissions for domain ${value}`);
                permissionValidationInProgress[option] = false;
                resolve(false);
              }
            });
          }
        });
      });
    }
  }
  
  if (option === "idp_type") {
    // Revoke AWS SSO permissions if switching away from AWS SSO
    if (props.idp_type === "awssso" && value !== "awssso") {
      debug("Switching away from AWS SSO, revoking permissions");
      permissionValidationInProgress[option] = true;
      
      try {
        await new Promise((resolve) => {
          // Check what AWS SSO permissions are actually granted before revoking
          api.permissions.contains(awsSsoPermissions, (hasAllPermissions) => {
            if (hasAllPermissions) {
              // All permissions are granted, revoke the full set
              api.permissions.remove(awsSsoPermissions, (removed) => {
                if (removed) {
                  debug("Successfully revoked all AWS SSO permissions");
                } else {
                  debug("Failed to revoke AWS SSO permissions");
                }
                resolve();
              });
            } else {
              // Check individual permissions and revoke only what's granted
              debug("Not all AWS SSO permissions are granted, checking individual permissions");
              const individualPermissions = [
                { permissions: ["tabs"] },
                { permissions: ["windows"] },
                { origins: ["https://*.awsapps.com/*"] },
                { origins: ["https://*.amazonaws.com/*"] }
              ];
              
              let revokedCount = 0;
              let totalChecks = individualPermissions.length;
              
              individualPermissions.forEach(permission => {
                api.permissions.contains(permission, (hasPermission) => {
                  if (hasPermission) {
                    api.permissions.remove(permission, (removed) => {
                      if (removed) {
                        debug(`Successfully revoked permission:`, permission);
                        revokedCount++;
                      } else {
                        debug(`Failed to revoke permission:`, permission);
                      }
                      
                      totalChecks--;
                      if (totalChecks === 0) {
                        debug(`Revoked ${revokedCount} individual AWS SSO permissions`);
                        resolve();
                      }
                    });
                  } else {
                    debug(`Permission not granted, skipping:`, permission);
                    totalChecks--;
                    if (totalChecks === 0) {
                      debug(`Revoked ${revokedCount} individual AWS SSO permissions`);
                      resolve();
                    }
                  }
                });
              });
            }
          });
        });
      } catch (error) {
        debug("Error revoking AWS SSO permissions:", error);
      }
      
      permissionValidationInProgress[option] = false;
    }
    
    if (value === "awssso") {
      debug("Enabled AWS SSO, adding new permissions");
      permissionValidationInProgress[option] = true;
      
      return new Promise((resolve) => {
        api.permissions.contains(awsSsoPermissions, (result) => {
          if (result) {
            debug("Permissions already granted.");
            permissionValidationInProgress[option] = false;
            resolve(true);
          } else {
            api.permissions.request(awsSsoPermissions, (granted) => {
              if (granted) {
                debug("Permissions granted!");
                permissionValidationInProgress[option] = false;
                resolve(true);
              } else {
                debug("Permissions denied.");
                permissionValidationInProgress[option] = false;
                resolve(false);
              }
            });
          }
        });
      });
    }
  }
  
  return true;
}

function loadOptions() {
  debug('Loading options from storage...');
  
  // Load all field values from storage
  const allFieldIds = [];
  Object.values(MENU_CONFIG.sections).forEach(section => {
    section.forEach(field => {
      allFieldIds.push(field.id);
    });
  });
  
  debug('Field IDs to load:', allFieldIds);
  
  storage.get(allFieldIds, function(props) {
    debug('Loaded properties from storage:', props);
    
    // Set values for each field
    allFieldIds.forEach(fieldId => {
      const element = $(`#${fieldId}`);
      if (element.length > 0) {
        if (element.attr('type') === 'checkbox') {
          element.prop('checked', props[fieldId] || false);
        } else {
          element.val(props[fieldId] || '');
        }
        debug(`Loaded field ${fieldId}:`, props[fieldId]);
      } else {
        debug(`Field element not found: ${fieldId}`);
      }
    });
    
    debug('Options loading complete');
  });
}

//display help information
$("img[id^='infoPic']").hover(function () {
  $(".layout").css("display", "block");
  $(".layout").text($(this).attr("alt")); 
}).mouseover( function(event){
  var left = event.pageX - $(this).offset().left + 100;
  var top = $(this).offset().top - window.scrollY - 32 ;
  $('.layout').css({top: top,left: left});
  $(".layout").css("display", "block");
}).mouseleave( function(){
  $(".layout").css("display", "none");
  $(".layout").text(''); 
});

$('.tablinks').click(function(){
  let id  = $(this).prop("id")
  $('.grid-container').each(function() {
    if ($(this).prop("id") === id){
      $(this).css("display", "grid");
    } else {
      $(this).css("display", "none");
    }
  })  
});

$( document ).ready(loadOptions)

// Function to update debug setting when it changes
async function updateDebugSetting() {
  await initializeDebug();
}

