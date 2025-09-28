console.log("DEBUG: my_script.js loaded successfully");

// ===== AUTHENTICATION SIDEBAR FUNCTIONALITY =====

// Global variable to track authentication state
let authenticationChoice = null;
let hasShownInitialPopup = false;
let isUserAuthenticated = false;
let currentUserData = {
  email: null,
  name: null,
  role: null
};

// Function to detect if user is authenticated by monitoring chat messages
function detectAuthenticationState() {
  // Look for authentication success messages in the chat
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Check for authentication success messages
        const addedNodes = Array.from(mutation.addedNodes);
        addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const messageText = node.textContent || '';
            
            // Check for registration/login success messages
            if (messageText.includes('✅ Registration successful!') || 
                messageText.includes('✅ Login successful!')) {
              console.log('Authentication success detected');
              
              // Extract user name from success message
              const nameMatch = messageText.match(/Welcome (?:back )?([^!]+)!/);
              if (nameMatch) {
                currentUserData.name = nameMatch[1];
              }
              
              // Set authentication state
              isUserAuthenticated = true;
              authenticationChoice = 'authenticated';
              
              // Store in localStorage for persistence
              localStorage.setItem('askNourIsAuthenticated', 'true');
              localStorage.setItem('askNourUserData', JSON.stringify(currentUserData));
              
              // Show sidebar
              setTimeout(() => {
                showAuthenticatedSidebar();
              }, 1000);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Function to check stored authentication state
function checkStoredAuthState() {
  const storedAuth = localStorage.getItem('askNourIsAuthenticated');
  const storedUserData = localStorage.getItem('askNourUserData');
  
  if (storedAuth === 'true' && storedUserData) {
    try {
      isUserAuthenticated = true;
      currentUserData = JSON.parse(storedUserData);
      authenticationChoice = 'authenticated';
      console.log('Restored authentication state for user:', currentUserData.name);
      return true;
    } catch (e) {
      console.error('Error parsing stored user data:', e);
      // Clear invalid data
      localStorage.removeItem('askNourIsAuthenticated');
      localStorage.removeItem('askNourUserData');
    }
  }
  
  return false;
}

// Function to create and show authenticated sidebar
function showAuthenticatedSidebar() {
  // Check if sidebar already exists
  if (document.querySelector('#auth-sidebar')) {
    return;
  }

  console.log('Creating authenticated sidebar for user:', currentUserData.name);

  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'auth-sidebar';
  sidebar.className = 'authenticated-sidebar';
  
  sidebar.innerHTML = `
    <!-- Collapse/Expand Button -->
    <button class="sidebar-collapse-btn" onclick="toggleSidebarCollapse()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div class="sidebar-header">
      <div class="user-info">
        <div class="user-avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="2"/>
            <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="user-details">
          <div class="user-name">${currentUserData.name || 'User'}</div>
          <div class="user-status">Authenticated</div>
        </div>
      </div>
    </div>
    
    <div class="sidebar-content">
      <div class="sidebar-section">
        <h3 class="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/>
          </svg>
          Sample Questions
        </h3>
        <div class="sample-questions">
          <div class="question-item" onclick="askSampleQuestion('What are the admission requirements for FUE?')">
            <span class="question-icon">🎓</span>
            <span class="question-text">What are the admission requirements for FUE?</span>
          </div>
          <div class="question-item" onclick="askSampleQuestion('Tell me about the available programs at FUE.')">
            <span class="question-icon">�</span>
            <span class="question-text">Tell me about the available programs at FUE.</span>
          </div>
          <div class="question-item" onclick="askSampleQuestion('How can I contact FUE administration?')">
            <span class="question-icon">�</span>
            <span class="question-text">How can I contact FUE administration?</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="handleLogout()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2"/>
          <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2"/>
          <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>Logout</span>
      </button>
    </div>
    
    <!-- Toggle button for mobile -->
    <button class="sidebar-toggle" onclick="toggleSidebar()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2"/>
        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2"/>
      </svg>
    </button>
  `;

  // Load external CSS styles
  loadExternalStyles();

  // Add sidebar to page
  document.body.appendChild(sidebar);

  // Adjust main content area
  adjustMainContentForSidebar();

  console.log('Authenticated sidebar displayed successfully');
}

// Function to handle logout
function handleLogout() {
  console.log('User logging out...');
  
  // Clear authentication state
  isUserAuthenticated = false;
  authenticationChoice = null;
  currentUserData = { email: null, name: null, role: null };
  
  // Clear localStorage
  localStorage.removeItem('askNourIsAuthenticated');
  localStorage.removeItem('askNourUserData');
  
  // Remove sidebar
  const sidebar = document.querySelector('#auth-sidebar');
  if (sidebar) {
    sidebar.remove();
  }
  
  // Reset main content layout
  resetMainContentLayout();
  
  // Show logout confirmation popup
  showLogoutConfirmationPopup();
}

// Function to toggle sidebar on mobile
function toggleSidebar() {
  const sidebar = document.querySelector('#auth-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('sidebar-open');
  }
}

// Function to toggle sidebar collapse/expand
function toggleSidebarCollapse() {
  const sidebar = document.querySelector('#auth-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('sidebar-collapsed');
    
    // Update the collapse button icon
    const collapseBtn = sidebar.querySelector('.sidebar-collapse-btn');
    if (collapseBtn) {
      const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
      collapseBtn.innerHTML = isCollapsed ? 
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>` :
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }
    
    // Adjust main content margin
    adjustMainContentForSidebar();
  }
}

// Function to handle sample question clicks
function askSampleQuestion(question) {
  console.log('Sample question clicked:', question);
  
  // Find input field
  const inputField = findInputField();
  if (!inputField) {
    console.error('Could not find input field for sample question');
    return;
  }

  // Set the question in the input field
  inputField.textContent = question;
  inputField.focus();

  // Trigger input events for React
  const inputEvent = new InputEvent('input', { 
    bubbles: true, 
    data: question,
    inputType: 'insertText'
  });
  inputField.dispatchEvent(inputEvent);

  // Auto-send the question after a short delay
  setTimeout(() => {
    const sendButton = findSendButton();
    if (sendButton) {
      sendButton.click();
      console.log('Sample question sent successfully');
    } else {
      console.error('Could not find send button for sample question');
    }
  }, 200);
}

// Function to adjust main content area when sidebar is shown
function adjustMainContentForSidebar() {
  // Find the main content area
  const mainContent = document.querySelector('#root') || 
                     document.querySelector('[data-panel-group-id=":rc:"]') ||
                     document.querySelector('.main-content') ||
                     document.body;
  
  const sidebar = document.querySelector('#auth-sidebar');
  const isCollapsed = sidebar && sidebar.classList.contains('sidebar-collapsed');
  const sidebarWidth = isCollapsed ? '60px' : '280px';
  
  if (mainContent) {
    mainContent.style.marginLeft = sidebarWidth;
    mainContent.style.transition = 'margin-left 0.3s ease';
  }
  
  // Adjust for mobile
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  if (mediaQuery.matches) {
    mainContent.style.marginLeft = '0';
  }
  
  // Listen for viewport changes
  mediaQuery.addListener((e) => {
    if (e.matches) {
      mainContent.style.marginLeft = '0';
    } else {
      const currentSidebar = document.querySelector('#auth-sidebar');
      const currentIsCollapsed = currentSidebar && currentSidebar.classList.contains('sidebar-collapsed');
      const currentSidebarWidth = currentIsCollapsed ? '60px' : '280px';
      mainContent.style.marginLeft = currentSidebarWidth;
    }
  });
}

// Function to reset main content layout when sidebar is removed
function resetMainContentLayout() {
  const mainContent = document.querySelector('#root') || 
                     document.querySelector('[data-panel-group-id=":rc:"]') ||
                     document.querySelector('.main-content') ||
                     document.body;
  
  if (mainContent) {
    mainContent.style.marginLeft = '0';
  }
}

// Function to load external CSS styles
function loadExternalStyles() {
  if (!document.querySelector('#external-styles')) {
    const link = document.createElement('link');
    link.id = 'external-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '/public/styles.css';
    document.head.appendChild(link);
    console.log('External CSS styles loaded successfully');
  }
}

// Function to show authentication popup on page load
function showInitialAuthenticationPopup() {
    // Only show once per session and if user is not already authenticated
    if (hasShownInitialPopup || isUserAuthenticated) {
        return;
    }
    
    // Wait a bit for the page to load
    setTimeout(() => {
        if (!authenticationChoice && !isUserAuthenticated) {
            console.log("Showing initial authentication popup");
            showAuthenticationPopup();
            hasShownInitialPopup = true;
        }
    }, 7000); // Show after 2 seconds
}

// Function to create and show authentication popup
function showAuthenticationPopup() {
  // Check if popup already exists
  if (document.querySelector('#auth-popup-overlay')) {
    return;
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'auth-popup-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
    animation: fadeIn 0.3s ease-out;
  `;

  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'auth-popup';
  popup.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 380px;
    width: 85%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    position: relative;
    animation: slideUp 0.3s ease-out;
    text-align: center;
    border: 1px solid #e5e7eb;
  `;

  // Create popup content
  popup.innerHTML = `
    <!-- Close button -->
    <button id="auth-popup-close" class="auth-popup-close" style="
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 50%;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 1;
    " title="Close (Esc)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div class="auth-popup-header">
      <h3 style="color: #374151; margin: 0 0 0.5rem 0; font-size: 1.4rem; font-weight: 600;">Welcome to Ask Nour</h3>
      <p style="color: #6b7280; margin: 0 0 1.5rem 0; font-size: 0.9rem; line-height: 1.4;">Choose how you'd like to continue</p>
    </div>

    <div class="auth-popup-body">
      <div class="auth-options" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
        <button id="auth-option-login" class="auth-option-btn login-btn" style="
          background: #AE0F0A;
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 17L15 12L10 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Login
        </button>

        <button id="auth-option-register" class="auth-option-btn register-btn" style="
          background: white;
          color: #AE0F0A;
          border: 1px solid #AE0F0A;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="17" y1="11" x2="23" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Register
        </button>

        <button id="auth-option-anonymous" class="auth-option-btn anonymous-btn" style="
          background: #f8f9fa;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Continue without account
        </button>
      </div>

      <p style="color: #9ca3af; font-size: 0.8rem; margin: 0; line-height: 1.3;">
        Create an account to save conversations and get personalized responses
      </p>
    </div>
  `;

  // Add popup to overlay
  overlay.appendChild(popup);

  // Add event listeners for buttons
  const anonymousBtn = popup.querySelector('#auth-option-anonymous');
  const loginBtn = popup.querySelector('#auth-option-login');
  const registerBtn = popup.querySelector('#auth-option-register');
  const closeBtn = popup.querySelector('#auth-popup-close');

  // Close button functionality
  closeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('User clicked close button - using default option (Continue without account)');
    authenticationChoice = 'anonymous';
    closeAuthPopup();
  });

  // Close button hover effects
  closeBtn.addEventListener('mouseenter', function() {
    this.style.background = '#f3f4f6';
    this.style.color = '#374151';
  });

  closeBtn.addEventListener('mouseleave', function() {
    this.style.background = 'transparent';
    this.style.color = '#6b7280';
  });

  // ESC key handler
  const handleEscKey = function(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      console.log('User pressed ESC key - using default option (Continue without account)');
      authenticationChoice = 'anonymous';
      closeAuthPopup();
    }
  };

  // Add ESC key listener and store reference for cleanup
  document.addEventListener('keydown', handleEscKey);
  if (!document._authEscHandlers) {
    document._authEscHandlers = [];
  }
  document._authEscHandlers.push(handleEscKey);

  // Add hover effects
  [anonymousBtn, loginBtn, registerBtn].forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      if (this.id === 'auth-option-login') {
        this.style.background = '#8B0C08';
      } else if (this.id === 'auth-option-register') {
        this.style.background = '#f3f4f6';
        this.style.color = '#8B0C08';
      } else if (this.id === 'auth-option-anonymous') {
        this.style.background = '#e5e7eb';
        this.style.color = '#374151';
      }
    });

    btn.addEventListener('mouseleave', function() {
      if (this.id === 'auth-option-login') {
        this.style.background = '#AE0F0A';
      } else if (this.id === 'auth-option-register') {
        this.style.background = 'white';
        this.style.color = '#AE0F0A';
      } else if (this.id === 'auth-option-anonymous') {
        this.style.background = '#f8f9fa';
        this.style.color = '#6b7280';
      }
    });
  });

  // Anonymous option
  anonymousBtn.addEventListener('click', function() {
    console.log('User chose: Continue Anonymously');
    authenticationChoice = 'anonymous';
    closeAuthPopup();
    // Continue with normal app flow (existing behavior)
  });

  // Login option
  loginBtn.addEventListener('click', function() {
    console.log('User chose: Login');
    authenticationChoice = 'login';
    closeAuthPopup();
    sendAuthMessage('I want to login');
  });

  // Register option
  registerBtn.addEventListener('click', function() {
    console.log('User chose: Register');
    authenticationChoice = 'register';
    closeAuthPopup();
    sendAuthMessage('I want to register');
  });

  // Close popup when clicking outside (optional - commented out for better UX)
  // overlay.addEventListener('click', function(e) {
  //   if (e.target === overlay) {
  //     closeAuthPopup();
  //   }
  // });

  // Add CSS animations
  addAuthPopupStyles();

  // Add to DOM
  document.body.appendChild(overlay);

  console.log('Authentication popup displayed');
}

// Function to close authentication popup
function closeAuthPopup() {
  const overlay = document.querySelector('#auth-popup-overlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
    
    // Clean up ESC key listener
    const escHandlers = document._authEscHandlers || [];
    escHandlers.forEach(handler => {
      document.removeEventListener('keydown', handler);
    });
    document._authEscHandlers = [];
  }
}

// Function to show logout confirmation popup
function showLogoutConfirmationPopup() {
  // Check if popup already exists
  if (document.querySelector('#logout-confirmation-overlay')) {
    return;
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'logout-confirmation-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
    animation: fadeIn 0.3s ease-out;
  `;

  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'logout-confirmation-popup';
  popup.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 400px;
    width: 85%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    position: relative;
    animation: slideUp 0.3s ease-out;
    text-align: center;
    border: 1px solid #e5e7eb;
  `;

  // Create popup content
  popup.innerHTML = `
    <div class="logout-popup-header">
      <div class="logout-icon" style="
        width: 60px;
        height: 60px;
        margin: 0 auto 1rem;
        background: #fee2e2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #dc2626;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2"/>
          <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2"/>
          <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <h3 style="color: #374151; margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600;">Logged Out Successfully</h3>
      <p style="color: #6b7280; margin: 0 0 1.5rem 0; font-size: 1rem; line-height: 1.5;">You have been logged out from your account. Would you like to refresh the page to start a new session?</p>
    </div>

    <div class="logout-popup-actions" style="display: flex; gap: 0.75rem; justify-content: center;">
      <button id="logout-refresh-btn" class="logout-action-btn" style="
        background: #AE0F0A;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        min-width: 120px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 4V10H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3.51 15A9 9 0 0 0 21 12A9 9 0 0 0 11.5 3C7 3 3.51 6.49 3.51 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Refresh Page
      </button>

      <button id="logout-continue-btn" class="logout-action-btn" style="
        background: white;
        color: #6b7280;
        border: 1px solid #e5e7eb;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        min-width: 120px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline points="9,18 15,12 9,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Continue
      </button>
    </div>
  `;

  // Add event listeners for buttons
  const refreshBtn = popup.querySelector('#logout-refresh-btn');
  const continueBtn = popup.querySelector('#logout-continue-btn');

  // Add hover effects
  refreshBtn.addEventListener('mouseenter', function() {
    this.style.background = '#8B0C08';
    this.style.transform = 'translateY(-1px)';
    this.style.boxShadow = '0 4px 8px rgba(174, 15, 10, 0.3)';
  });

  refreshBtn.addEventListener('mouseleave', function() {
    this.style.background = '#AE0F0A';
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = 'none';
  });

  continueBtn.addEventListener('mouseenter', function() {
    this.style.background = '#f3f4f6';
    this.style.color = '#374151';
    this.style.transform = 'translateY(-1px)';
    this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
  });

  continueBtn.addEventListener('mouseleave', function() {
    this.style.background = 'white';
    this.style.color = '#6b7280';
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = 'none';
  });

  // Refresh button action
  refreshBtn.addEventListener('click', function() {
    console.log('User chose to refresh the page after logout');
    closeLogoutConfirmationPopup();
    window.location.reload();
  });

  // Continue button action
  continueBtn.addEventListener('click', function() {
    console.log('User chose to continue without refreshing after logout');
    closeLogoutConfirmationPopup();
  });

  // Close popup when clicking outside
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      closeLogoutConfirmationPopup();
    }
  });

  // Add to overlay
  overlay.appendChild(popup);

  // Add to DOM
  document.body.appendChild(overlay);

  console.log('Logout confirmation popup displayed');
}

// Function to close logout confirmation popup
function closeLogoutConfirmationPopup() {
  const overlay = document.querySelector('#logout-confirmation-overlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }
}

// Function to send authentication message to chat
function sendAuthMessage(message) {
  console.log('Sending auth message:', message);
  
  // Find input field
  const inputField = findInputField();
  if (!inputField) {
    console.error('Could not find input field for auth message');
    return;
  }

  // Set the message in the input field
  inputField.textContent = message;
  inputField.focus();

  // Trigger input events for React
  const inputEvent = new InputEvent('input', { 
    bubbles: true, 
    data: message,
    inputType: 'insertText'
  });
  inputField.dispatchEvent(inputEvent);

  // Find and click the send button
  setTimeout(() => {
    const sendButton = findSendButton();
    if (sendButton) {
      sendButton.click();
      console.log('Auth message sent successfully');
    } else {
      console.error('Could not find send button for auth message');
    }
  }, 200);
}

// Function to add required CSS styles for auth popup (now handled by external CSS)
function addAuthPopupStyles() {
  // CSS styles are now loaded from external file
  // This function is kept for compatibility but does nothing
  console.log('Auth popup styles loaded from external CSS file');
}

// Function to check if authentication popup should be shown
function shouldShowAuthPopup() {
  // Check if user has already made a choice in this session
  if (authenticationChoice !== null) {
    return false;
  }
  
  // Check if there's a stored preference (you can implement localStorage here)
  const storedChoice = localStorage.getItem('askNourAuthChoice');
  if (storedChoice) {
    authenticationChoice = storedChoice;
    return false;
  }
  
  return true;
}

// Function to store user's authentication choice
function storeAuthChoice(choice) {
  authenticationChoice = choice;
  // Optionally store in localStorage for persistence across sessions
  localStorage.setItem('askNourAuthChoice', choice);
}

// Function to show auth popup when app loads
function initializeAuthentication() {
  // Wait for page to be fully loaded
  setTimeout(() => {
    if (shouldShowAuthPopup()) {
      showAuthenticationPopup();
    }
  }, 7000); // Show popup after 1 second delay
}

// ===== GLOBAL HELPER FUNCTIONS =====

// Global helper function to find input field
function findInputField() {
  const inputSelectors = [
    "#message-composer div[contenteditable]",
    "#chat-input",
    "#message-composer textarea",
    "#message-composer input",
    "#message-composer [contenteditable='true']",
    "#message-composer [role='textbox']"
  ];
  
  for (const selector of inputSelectors) {
    try {
      const inputField = document.querySelector(selector);
      if (inputField && inputField.offsetParent !== null) {
        return inputField;
      }
    } catch (e) {
      console.log(`Selector failed: ${selector}`, e);
    }
  }
  return null;
}

// Global helper function to find send button
function findSendButton() {
  const sendButtonSelectors = [
    "#chat-submit",
    "button[type='submit']", 
    "button[aria-label*='send']",
    "button[aria-label*='Send']",
    "#message-composer button:not(#microphone-button)"
  ];
  
  for (const selector of sendButtonSelectors) {
    const sendButton = document.querySelector(selector);
    if (sendButton && sendButton.offsetParent !== null && sendButton.id !== 'microphone-button') {
      return sendButton;
    }
  }
  return null;
}

// Function to inspect DOM structure for debugging
function inspectChatInputDOM() {
  // Removed for production
}

// Function to add microphone button to existing Chainlit chat input (React-compatible)
function addMicrophoneButton() {
  // Check if microphone button already exists
  if (document.querySelector("#microphone-button")) {
    return false;
  }

  // Try multiple selectors to find the submit button in Chainlit
  const submitButtonSelectors = [
    "#chat-submit", 
    "button[type='submit']",
    "button[aria-label*='send']",
    "button[aria-label*='Send']",
    "button svg[viewBox*='24']", // Look for buttons with SVG icons
    ".inline-flex.items-center.justify-center button", // Chainlit's button classes
    "[data-testid='send-button']"
  ];
  
  let submitButton = null;
  for (const selector of submitButtonSelectors) {
    submitButton = document.querySelector(selector);
    if (submitButton) {
      break;
    }
  }
  
  if (!submitButton) {
    // Try to find any button in the message composer area
    const messageComposer = document.querySelector("#message-composer");
    if (messageComposer) {
      submitButton = messageComposer.querySelector("button");
    }
    
    if (!submitButton) {
      return false;
    }
  }
  
  // Find the message composer (input container) to add buttons inside it
  const messageComposer = document.querySelector("#message-composer");
  if (!messageComposer) {
    return false;
  }

  // Create microphone button
  const microphoneButton = document.createElement("button");
  microphoneButton.id = "microphone-button";
  microphoneButton.type = "button";
  microphoneButton.setAttribute("aria-label", "Record voice message");
  
  // Add strong inline styles to ensure proper positioning inside input
  microphoneButton.style.cssText = `
    background: #AE0F0A !important;
    color: white !important;
    border: none !important;
    border-radius: 50% !important;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    margin-left: 8px !important;
    z-index: 1000 !important;
    position: absolute !important;
    right: 50px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    flex-shrink: 0 !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 2px 4px rgba(174, 15, 10, 0.2) !important;
  `;
  
  microphoneButton.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12V4C10 2.89543 10.8954 2 12 2Z" fill="white"/>
      <path d="M18 10V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V10H4V12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12V10H18Z" fill="white"/>
      <path d="M12 20V22H12Z" fill="white"/>
    </svg>
  `;
  
  // Add hover effect
  microphoneButton.addEventListener("mouseenter", function() {
    if (!this.isRecording) {
      this.style.background = "#8B0C08 !important";
      this.style.transform = "translateY(-50%) scale(1.05) !important";
    }
  });
  
  microphoneButton.addEventListener("mouseleave", function() {
    if (!this.isRecording) {
      this.style.background = "#AE0F0A !important";
      this.style.transform = "translateY(-50%) scale(1) !important";
    }
  });
  
  // Recording state variables
  microphoneButton.isRecording = false;
  microphoneButton.mediaRecorder = null;
  microphoneButton.audioChunks = [];
  microphoneButton.recordingTimeout = null;
  microphoneButton.recordingStartTime = null;
  
  // Add click event listener with user-controlled audio recording
  microphoneButton.addEventListener("click", async function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("microphone clicked, current state:", this.isRecording ? "recording" : "idle");
    
    if (!this.isRecording) {
      // Start recording
      await startRecording.call(this);
    } else {
      // Stop recording
      stopRecording.call(this);
    }
  });
  
  // Function to start recording
  async function startRecording() {
    try {
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.audioChunks = [];
      
      // Update button to recording state
      this.style.background = "#FF6B6B !important"; // Red color to indicate recording
      this.setAttribute("aria-label", "Stop recording (click to stop)");
      
      // Update button icon to stop icon
      this.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
        </svg>
      `;
      
      console.log("Starting recording...");
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      console.log("Microphone access granted");
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing audio...");
        
        // Update button to show processing
        this.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
        this.style.background = "#FFA500 !important"; // Orange for processing
        
        // Create blob from recorded chunks
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        
        try {
          // Convert blob to base64
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Audio = reader.result.split(',')[1]; // Remove data:audio/webm;base64, prefix
            
            console.log("Audio converted to base64, length:", base64Audio.length);
            
            // Find input field first
            const inputField = findInputField();
            if (!inputField) {
              console.error("Could not find input field");
              return;
            }
            
            // Show loading state in input field (but don't send it)
            const originalValue = inputField.textContent;
            inputField.textContent = "🔄 Transcribing audio...";
            inputField.focus();
            
            // Send audio data directly via a custom event to avoid going through chat
            try {
              // Store the audio data globally so we can access it
              window.currentAudioTranscription = {
                audioData: base64Audio,
                inputField: inputField,
                originalValue: originalValue
              };
              
              // Send the audio data through Chainlit's message system with a special marker
              const audioMessage = `[AUDIO_TRANSCRIPTION_REQUEST]${base64Audio}`;
              
              // Temporarily disable the message display by intercepting
              const messageComposer = document.querySelector("#message-composer");
              if (messageComposer) {
                // Add a flag to prevent the message from being displayed
                messageComposer.setAttribute('data-transcribing', 'true');
              }
              
              // Set the audio message temporarily in the input field
              inputField.textContent = audioMessage;
              
              // Trigger input event for React
              const audioInputEvent = new InputEvent('input', { 
                bubbles: true, 
                data: audioMessage,
                inputType: 'insertText'
              });
              inputField.dispatchEvent(audioInputEvent);
              
              // Find and click the send button
              setTimeout(() => {
                const sendButton = findSendButton();
                if (sendButton) {
                  // Before clicking, set up a mutation observer to hide the message
                  setupMessageHider();
                  
                  sendButton.click();
                  console.log("Audio message sent for transcription (will be hidden)");
                  
                  // Clear the input field after sending and restore loading message
                  setTimeout(() => {
                    inputField.textContent = "🔄 Transcribing audio...";
                    const clearEvent = new InputEvent('input', { 
                      bubbles: true, 
                      data: "🔄 Transcribing audio...",
                      inputType: 'insertText'
                    });
                    inputField.dispatchEvent(clearEvent);
                    
                    // Remove the transcribing flag
                    if (messageComposer) {
                      messageComposer.removeAttribute('data-transcribing');
                    }
                  }, 100);
                  
                } else {
                  console.error("Could not find send button");
                  // Restore original value if send failed
                  inputField.textContent = originalValue;
                  const restoreEvent = new InputEvent('input', { 
                    bubbles: true, 
                    data: originalValue,
                    inputType: 'insertText'
                  });
                  inputField.dispatchEvent(restoreEvent);
                }
              }, 200);
              
            } catch (error) {
              console.error("Error sending audio for transcription:", error);
              // Restore original value on error
              inputField.textContent = originalValue;
              const restoreEvent = new InputEvent('input', { 
                bubbles: true, 
                data: originalValue,
                inputType: 'insertText'
              });
              inputField.dispatchEvent(restoreEvent);
            }
            
            // Update button to show success
            this.style.background = "#4CAF50 !important";
            this.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;
          };
          
          reader.onerror = () => {
            console.error("Error reading audio file");
            resetButton.call(this);
          };
          
          reader.readAsDataURL(audioBlob);
          
        } catch (error) {
          console.error("Error processing audio:", error);
          resetButton.call(this);
          alert("Failed to process audio. Please try again.");
        }
        
        // Clean up
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        this.audioChunks = [];
        
        // Reset button after 2 seconds
        setTimeout(() => {
          resetButton.call(this);
        }, 2000);
      };
      
      // Start recording
      this.mediaRecorder.start();
      console.log("Recording started - click again to stop (max 15 seconds)");
      
      // Set maximum recording time of 15 seconds
      this.recordingTimeout = setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          console.log("Maximum recording time reached (15s), stopping...");
          stopRecording.call(this);
        }
      }, 15000); // 15 seconds maximum
      
    } catch (error) {
      console.error("Error starting recording:", error);
      resetButton.call(this);
      alert("Could not access microphone. Please check permissions and try again.");
    }
  }
  
  // Function to stop recording
  function stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }
    
    this.isRecording = false;
    
    // Clear the timeout
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    
    // Calculate recording duration
    const recordingDuration = this.recordingStartTime ? (Date.now() - this.recordingStartTime) / 1000 : 0;
    console.log(`Recording stopped after ${recordingDuration.toFixed(1)} seconds`);
    
    // Stop the media recorder
    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    // Stop all tracks to release microphone
    if (this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
  
  // Function to reset button to original state
  function resetButton() {
    this.isRecording = false;
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    
    this.style.background = "#AE0F0A !important";
    this.setAttribute("aria-label", "Record voice message");
    this.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12V4C10 2.89543 10.8954 2 12 2Z" fill="white"/>
        <path d="M18 10V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V10H4V12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12V10H18Z" fill="white"/>
        <path d="M12 20V22H12Z" fill="white"/>
      </svg>
    `;
  }

  // Helper function to hide audio transcription messages from chat
  function setupMessageHider() {
    const messageHider = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this message contains base64 audio data
              const messageContent = node.textContent || '';
              if (messageContent.includes('[AUDIO_TRANSCRIPTION_REQUEST]')) {
                console.log('Hiding audio transcription request message');
                
                // Just hide the message, don't remove it to avoid React conflicts
                try {
                  node.style.display = 'none';
                  node.style.visibility = 'hidden';
                  node.style.height = '0px';
                  node.style.overflow = 'hidden';
                  node.style.maxHeight = '0px';
                  node.style.margin = '0px';
                  node.style.padding = '0px';
                  console.log('Successfully hidden audio message');
                } catch (e) {
                  console.log('Could not hide audio message:', e);
                }
              }
            }
          });
        }
      });
    });
    
    // Start observing for a short time to catch the audio message
    messageHider.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Stop observing after 5 seconds
    setTimeout(() => {
      messageHider.disconnect();
    }, 5000);
  }

  // Add mutation observer to watch for transcription results
  const transcriptionObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this is a message element that might contain transcription
            const messageContent = node.textContent || '';
            if (messageContent.includes('[TRANSCRIPTION_RESULT]')) {
              console.log('Detected transcription result message:', messageContent);
              
              // Extract the transcribed text
              const transcribedText = messageContent.replace('[TRANSCRIPTION_RESULT]', '').trim();
              console.log('Extracted transcribed text:', transcribedText);
              
              // Find input field and insert the text
              const inputField = findInputField();
              if (inputField) {
                // Clear any existing content
                inputField.textContent = '';
                inputField.focus();
                
                // Set the transcribed text
                inputField.textContent = transcribedText;
                
                // Trigger input events for React
                const inputEvent = new InputEvent('input', { 
                  bubbles: true, 
                  data: transcribedText,
                  inputType: 'insertText'
                });
                inputField.dispatchEvent(inputEvent);
                
                // Also trigger change event
                const changeEvent = new Event('change', { bubbles: true });
                inputField.dispatchEvent(changeEvent);
                
                console.log('Transcribed text inserted into input field successfully');
                
                // Show notification
                // showNotification('🎤 Voice transcribed - ready to send!', '#4CAF50');
                
                // Hide the transcription result message (don't remove it)
                try {
                  if (node && node.style) {
                    node.style.display = 'none';
                    node.style.visibility = 'hidden';
                    node.style.height = '0px';
                    node.style.overflow = 'hidden';
                    node.style.maxHeight = '0px';
                    node.style.margin = '0px';
                    node.style.padding = '0px';
                    console.log('Successfully hidden transcription result message');
                  }
                } catch (e) {
                  console.log('Could not hide transcription message:', e);
                }
                
              } else {
                console.error('Could not find input field for transcribed text');
                showNotification('Voice transcribed but could not insert into input field', '#ff9800');
              }
            }
          }
        });
      }
    });
  });

  // Start observing the document for changes
  transcriptionObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Helper function to show notifications
  function showNotification(message, color = '#4CAF50') {
    const notification = document.createElement('div');
    notification.innerHTML = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Make the message composer container relative for absolute positioning
  messageComposer.style.position = "relative";
  
  // Style the submit button to be positioned inside the input as well
  if (submitButton) {
    submitButton.style.cssText = `
      position: absolute !important;
      right: 8px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      background: #AE0F0A !important;
      color: white !important;
      border: none !important;
      border-radius: 50% !important;
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 1001 !important;
      flex-shrink: 0 !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 2px 4px rgba(174, 15, 10, 0.2) !important;
    `;
  }

  // Add both buttons to the message composer
  messageComposer.appendChild(microphoneButton);
  
  return true;
}

// Legacy function - now calls the new approach
function modifyChatInputLayout() {
  return addMicrophoneButton();
}

// Function to hide "Built with Chainlit" text
function hideBuiltWithChainlit() {
  // Target the specific watermark element
  const watermarkElements = document.querySelectorAll(
    'a.watermark, a[href*="chainlit.io"]'
  );

  watermarkElements.forEach((element) => {
    element.style.display = "none";
  });

  // More comprehensive hiding using multiple selectors
  const chainlitSelectors = [
    "a.watermark",
    'a[href*="chainlit.io"]',
    'a[target="_blank"]:has(div:contains("Built with"))',
    ".watermark",
    'div:contains("Built with") + svg',
    'div.text-xs:contains("Built with")',
  ];

  chainlitSelectors.forEach((selector) => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (
          el.textContent.includes("Built with") ||
          el.href?.includes("chainlit.io")
        ) {
          el.style.display = "none";
        }
      });
    } catch (e) {
      // Ignore selector errors for unsupported selectors
    }
  });

  // Enhanced mutation observer specifically for watermark elements
  const watermarkObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this node or its children contain watermark text
            const walker = document.createTreeWalker(
              node,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            let textNode;
            while (textNode = walker.nextNode()) {
              if (textNode.textContent.includes("Built with")) {
                // Hide the closest link or div element
                let parent = textNode.parentElement;
                while (parent && parent !== document.body) {
                  if (parent.tagName === 'A' || parent.classList.contains('watermark')) {
                    parent.style.display = "none";
                    break;
                  }
                  parent = parent.parentElement;
                }
              }
            }
          }
        });
      }
    });
  });

  watermarkObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Function to add dir="auto" to all elements with role="article"
function addDirAutoToArticles() {
  const articleElements = document.querySelectorAll('[role="article"]');
  articleElements.forEach((element) => {
    element.setAttribute("dir", "auto");
  });
}

// Function to replace overflow-auto with overflow-hidden in specific div
function replaceOverflowClass() {
  // Target the specific parent div with data-panel-group-id=":rc:"
  const parentPanel = document.querySelector('[data-panel-group-id=":rc:"]');

  if (parentPanel) {
    // Look for the specific child div within this exact parent
    const targetDiv = parentPanel.querySelector(
      ".flex.flex-row.flex-grow.overflow-auto"
    );

    if (targetDiv) {
      console.log("Found target div, replacing overflow-auto with overflow-hidden");
      targetDiv.classList.remove("overflow-auto");
      targetDiv.classList.add("overflow-hidden");
    } else {
      console.log("Target div not found within parent panel");
    }
  } else {
    console.log("Parent div with data-panel-group-id=':rc:' not found");
  }
}

// Function to clone new chat button with all event listeners
function cloneNewChatButton() {
  // FIRST: Find the header parent div with id="header"
  const headerDiv = document.querySelector("#header");

  if (!headerDiv) {
    console.log("Header div with id='header' not found");
    return null;
  }

  console.log("Found header div:", headerDiv);

  // THEN: Find the new chat button within the header
  const originalButton = headerDiv.querySelector("#new-chat-button");

  if (!originalButton) {
    console.log("Original new chat button not found within header");
    return null;
  }

  // Find the parent div that contains the button - this is where the event listeners likely are
  const buttonContainer = originalButton.closest(".flex.items-center");

  if (!buttonContainer) {
    console.log("Button container div not found within header");
    return null;
  }

  console.log(
    "Found original button container within header:",
    buttonContainer
  );
  console.log("Container HTML:", buttonContainer.outerHTML);

  // Clone the ENTIRE container with deep cloning to preserve ALL structure and event listeners
  const clonedContainer = buttonContainer.cloneNode(true);

  // Find the button within the cloned container
  const clonedButton = clonedContainer.querySelector("button");

  if (clonedButton) {
    // Update the ID to avoid conflicts
    clonedButton.id = "header-new-chat-button";
    clonedButton.setAttribute("data-cloned", "true");
    
    // Remove any existing event listeners by cloning the node
    const cleanButton = clonedButton.cloneNode(true);
    clonedButton.parentNode.replaceChild(cleanButton, clonedButton);
    
    // Re-reference the clean button
    const finalButton = clonedContainer.querySelector("button");
    
    // Make sure the button is properly styled and functional
    finalButton.style.cssText = `
      background: white !important;
      color: #AE0F0A !important;
      border: 2px solid white !important;
      padding: 6px 12px !important;
      border-radius: 20px !important;
      font-weight: 600 !important;
      transition: all 0.3s ease !important;
      text-decoration: none !important;
      font-size: 0.8rem !important;
      margin-right: 10px !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
    `;

    // Add event listener to reload the page when clicked
    finalButton.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Header new chat button clicked - reloading page");
      window.location.reload();
    });
    
    // Also add a backup click handler using onclick attribute
    finalButton.setAttribute("onclick", "console.log('Backup click handler triggered'); window.location.reload();");
    
    console.log("Event listeners added to header new chat button");
  }

  // Add identifier to the container
  clonedContainer.setAttribute("data-cloned-container", "true");

  console.log(
    "New chat button container cloned successfully from header with all event listeners preserved"
  );
  console.log("Cloned container HTML:", clonedContainer.outerHTML);

  return clonedContainer; // Return the entire container, not just the button
}

// Function to add FUE-style footer strip after input
function addFUEFooter() {
  // Check if our footer strip already exists
  if (document.querySelector(".fue-bottom-strip")) {
    return;
  }

  // Find the message composer container
  const messageComposer = document.querySelector("#message-composer");
  if (!messageComposer) {
    return;
  }

  // Find the parent container of message composer
  const parentContainer = messageComposer.parentElement;
  if (!parentContainer) {
    return;
  }

  // Create the bottom strip with red background
  const bottomStrip = document.createElement("div");
  bottomStrip.className = "fue-bottom-strip";
  bottomStrip.innerHTML = `
    <div class="strip-content">
      <!-- Contact details on the left -->
      <div class="strip-left">
        <div class="contact-info">
          <div class="phone-line">
            <span class="phone-symbol">📞</span>
            <span class="phone-number">16383</span>
          </div>
          <div class="website-line">
            <span class="website">www.fue.edu.eg</span>
          </div>
        </div>
      </div>
      
      <!-- Logo on the right -->
      <div class="strip-right">
        <img src="/public/branding-logo.png" alt="FUE Logo" class="strip-brand-logo" onerror="this.style.display='none'">
      </div>
    </div>
  `;

  // Insert the strip after the message composer
  parentContainer.insertBefore(bottomStrip, messageComposer.nextSibling);

  console.log("FUE bottom strip added successfully");
}

// Function to add FUE-style header to replace the existing header
function addFUEHeader() {
  // Check if our header already exists
  if (document.querySelector(".fue-custom-header")) {
    return;
  }

  // Find the existing header
  const existingHeader = document.querySelector("#header");
  if (!existingHeader) {
    return;
  }

  // FIRST: Clone the new chat button BEFORE replacing the header
  const originalButton = document.querySelector("#new-chat-button");
  let clonedButtonContainer = null;

  if (originalButton) {
    console.log("Cloning button container before header replacement...");
    clonedButtonContainer = cloneNewChatButton(); // This now returns the container
    console.log("Button container cloned successfully:", clonedButtonContainer);
  } else {
    console.log("Original new chat button not found before header replacement");
  }

  // Create the new FUE-style header with responsive design
  const fueHeader = document.createElement("nav");
  fueHeader.className = "navbar navbar-expand-lg navbar-dark fue-custom-header";

  fueHeader.innerHTML = `
    <div class="container-fluid">
      <!-- Mobile first: Hamburger left, title center, logo right -->
      <div class="mobile-header d-lg-none">
        <button class="navbar-toggler hamburger-btn" type="button" id="navbar-hamburger" aria-label="Toggle navigation">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
        <div class="mobile-header-title">
          <div class="brand-title-mobile">Ask Nour</div>
          <div class="brand-subtitle-mobile">FUE Knowledge Companion</div>
        </div>
  <!-- University logo removed from mobile view -->
      </div>

      <!-- Mobile menu (collapsed by default, appears below navbar) -->
      <div class="mobile-menu d-lg-none" id="mobile-menu">
        <div class="mobile-menu-content">
          <div class="mobile-menu-item" id="mobile-new-chat-container">
            <!-- New Chat button will be inserted here -->
          </div>
          <div class="mobile-menu-item">
            <button class="btn btn-fue-white mobile-register-btn" onclick="window.open('https://bit.ly/fue_asknour', '_blank')">
              <i class="bi bi-person-plus"></i> Register
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop layout (hidden on mobile) -->
      <div class="header-layout d-none d-lg-flex">
        <!-- Logo and cloned button on the left -->
        <div class="header-left">
          <div id="new-chat-container" class="header-button-container"></div>
          <img src="/public/fue-white-logo.png" alt="Ask Nour Logo" class="brand-logo" onerror="this.style.display='none'">
        </div>
        
        <!-- Ask Nour text in the middle -->
        <div class="header-center">
          <div class="brand-title">Ask Nour</div>
          <div class="brand-subtitle">FUE Knowledge Companion</div>
        </div>
        
        <!-- Register button on the right -->
        <div class="header-right">
          <button class="btn btn-fue-white btn-sm" onclick="window.open('https://bit.ly/fue_asknour', '_blank')">
            <i class="bi bi-person-plus"></i> Register
          </button>
        </div>
      </div>
    </div>
  `;

  // Replace the existing header
  existingHeader.parentNode.replaceChild(fueHeader, existingHeader);

  // Add the cloned button container to both desktop and mobile locations
  if (clonedButtonContainer) {
    // Desktop version
    const buttonContainer = document.querySelector("#new-chat-container");
    if (buttonContainer) {
      const desktopClone = clonedButtonContainer.cloneNode(true);
      
      // Make sure the desktop button has proper event listeners
      const desktopButton = desktopClone.querySelector("button");
      if (desktopButton) {
        // Clean up any existing event listeners
        const cleanDesktopButton = desktopButton.cloneNode(true);
        desktopButton.parentNode.replaceChild(cleanDesktopButton, desktopButton);
        
        // Re-reference the clean button
        const finalDesktopButton = desktopClone.querySelector("button");
        finalDesktopButton.id = "header-new-chat-button";
        
        // Make sure the button is properly styled
        finalDesktopButton.style.cssText = `
          background: white !important;
          color: #AE0F0A !important;
          border: 2px solid white !important;
          padding: 6px 12px !important;
          border-radius: 20px !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
          text-decoration: none !important;
          font-size: 0.8rem !important;
          margin-right: 10px !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 4px !important;
        `;
        
        // Add event listener for desktop button
        finalDesktopButton.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          console.log("Desktop header new chat button clicked - reloading page");
          window.location.reload();
        });
        
        // Add backup onclick handler
        finalDesktopButton.setAttribute("onclick", "console.log('Desktop backup click handler'); window.location.reload();");
        
        console.log("Event listeners added to desktop new chat button");
      }
      
      buttonContainer.appendChild(desktopClone);
      console.log("Cloned button container added to desktop header successfully");
    }

    // Mobile version
    const mobileButtonContainer = document.querySelector("#mobile-new-chat-container");
    if (mobileButtonContainer) {
      const mobileClone = clonedButtonContainer.cloneNode(true);
      // Add mobile-specific classes to the mobile clone
      const mobileButton = mobileClone.querySelector("button");
      if (mobileButton) {
        mobileButton.classList.add("mobile-new-chat-btn");
        mobileButton.id = "mobile-new-chat-button";
        
        // Clean up and re-add event listeners for mobile button
        const cleanMobileButton = mobileButton.cloneNode(true);
        mobileButton.parentNode.replaceChild(cleanMobileButton, mobileButton);
        
        // Re-reference the clean mobile button
        const finalMobileButton = mobileClone.querySelector("button");
        
        // Make sure the mobile button is properly styled
        finalMobileButton.style.cssText = `
          background: rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          border: 2px solid rgba(255, 255, 255, 0.3) !important;
          padding: 12px 24px !important;
          border-radius: 25px !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          min-width: 140px !important;
          transition: all 0.3s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          cursor: pointer !important;
        `;
        
        // Add event listener for mobile button
        finalMobileButton.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          console.log("Mobile new chat button clicked - reloading page");
          // Close the mobile menu first
          closeMobileMenu();
          // Then reload the page
          window.location.reload();
        });
        
        // Also add backup onclick handler
        finalMobileButton.setAttribute("onclick", "console.log('Mobile backup click handler'); window.location.reload();");
        
        console.log("Event listeners added to mobile new chat button");
      }
      mobileButtonContainer.appendChild(mobileClone);
      console.log("Cloned button container added to mobile header successfully");
    }
  }

  // Add hamburger menu functionality
  addHamburgerMenuFunctionality();

  console.log("FUE responsive header added successfully");
}

// Function to add hamburger menu functionality
function addHamburgerMenuFunctionality() {
  const hamburgerBtn = document.querySelector("#navbar-hamburger");
  const mobileMenu = document.querySelector("#mobile-menu");

  if (!hamburgerBtn || !mobileMenu) {
    console.log("Hamburger button or mobile menu not found");
    return;
  }

  // Toggle mobile menu
  hamburgerBtn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const isOpen = mobileMenu.classList.contains("show");
    
    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  // Close menu when clicking outside
  document.addEventListener("click", function(e) {
    if (mobileMenu.classList.contains("show") && 
        !mobileMenu.contains(e.target) && 
        !hamburgerBtn.contains(e.target)) {
      closeMobileMenu();
    }
  });

  // Close menu when pressing Escape
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && mobileMenu.classList.contains("show")) {
      closeMobileMenu();
    }
  });

  function openMobileMenu() {
    mobileMenu.classList.add("show");
    hamburgerBtn.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove("show");
    hamburgerBtn.classList.remove("active");
    document.body.style.overflow = ""; // Restore scrolling
  }
}

// Function to add required CSS styles for the header (now handled by external CSS)
function addFUEHeaderStyles() {
  // CSS styles are now loaded from external file
  // This function is kept for compatibility but does nothing
  console.log('FUE header styles loaded from external CSS file');
}

// Function to handle register modal (you can customize this)
function showRegisterModal() {
  // Create a simple modal or redirect to registration
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 400px; width: 90%;">
      <h3 style="color: #AE0F0A; margin-bottom: 1rem;">Register for Ask Nour</h3>
      <p style="color: #495057; margin-bottom: 2rem;">Get access to enhanced features and personalized AI assistance.</p>
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" 
                style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 6px; cursor: pointer;">
          Cancel
        </button>
        <button onclick="window.open('/register', '_blank'); this.closest('[style*=\"position: fixed\"]').remove()" 
                style="padding: 8px 16px; background: #AE0F0A; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Register Now
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Function to add Ask Nour branding to header (legacy function - now replaced by addFUEHeader)
function addAskNourBranding() {
  // This function is now replaced by addFUEHeader for better integration
  addFUEHeader();
}

function removeWaterMark() {
  const watermark = document.querySelector(".watermark");
  if (watermark) {
    watermark.style.display = "none";
  }
}

// ===== TEXT-TO-SPEECH SPEAKER FUNCTIONALITY =====

// Global TTS state management
let currentSpeechUtterance = null;
let currentSpeakingIcon = null;
let isInitializingSpeech = false;

// ===== RETRY BUTTON FUNCTIONALITY =====

// Global retry state management
let currentRetryingButton = null;
let isRetryInProgress = false;

// Function to create retry button
function createRetryButton(messageElement) {
  // Check if retry button already exists in this message
  if (messageElement.querySelector('.retry-icon, .message-retry')) {
    return null;
  }
  
  // Extract message text to ensure it has substantial content (minimum 20 characters)
  const messageText = extractMessageText(messageElement);
  if (!messageText || messageText.trim().length < 20) {
    return null;
  }
  
  // Check for loading states ("Thinking...", "Processing...", etc.)
  const lowerText = messageText.toLowerCase();
  if (lowerText.includes('thinking') || 
      lowerText.includes('processing') || 
      lowerText.includes('loading') ||
      lowerText.includes('...')) {
    return null;
  }
  
  // Create retry button
  const retryButton = document.createElement('button');
  retryButton.className = 'retry-icon message-retry';
  retryButton.setAttribute('aria-label', 'Retry this question');
  retryButton.setAttribute('data-message-element', 'true');
  
  // Style the retry button to match speaker icon
  retryButton.style.cssText = `
    background: transparent !important;
    border: none !important;
    color: #AE0F0A !important;
    cursor: pointer !important;
    padding: 4px !important;
    margin-left: 4px !important;
    margin-right: 4px !important;
    border-radius: 4px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.2s ease !important;
    vertical-align: middle !important;
    flex-shrink: 0 !important;
    opacity: 0.7 !important;
    position: relative !important;
    top: -1px !important;
  `;
  
  // Set initial icon (refresh/reload icon)
  retryButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 4V10H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 20V14H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M3.51 15A9 9 0 0 0 18.36 18.36L23 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  
  retryButton.title = 'Retry this question';
  
  // Add hover effects
  retryButton.addEventListener('mouseenter', function() {
    if (!this.classList.contains('retrying')) {
      this.style.opacity = '1';
      this.style.backgroundColor = 'rgba(174, 15, 10, 0.1)';
    }
  });
  
  retryButton.addEventListener('mouseleave', function() {
    if (!this.classList.contains('retrying')) {
      this.style.opacity = '0.7';
      this.style.backgroundColor = 'transparent';
    }
  });
  
  // Add click event listener
  retryButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // If already retrying, ignore additional clicks
    if (isRetryInProgress || this.classList.contains('retrying')) {
      return;
    }
    
    // Find the user query that prompted this response
    const userQuery = findPrecedingUserMessage(messageElement);
    if (userQuery) {
      retryQuery(userQuery, this);
    } else {
      console.error('Could not find preceding user message for retry');
      showRetryError(this, 'Could not find the original question to retry');
    }
  });
  
  return retryButton;
}

// Function to find the preceding user message
function findPrecedingUserMessage(assistantMessageElement) {
  console.log('Looking for preceding user message...');
  
  // Strategy 1: Look for previous sibling elements with user message indicators
  let currentElement = assistantMessageElement.previousElementSibling;
  while (currentElement) {
    if (currentElement.hasAttribute('data-step-type') && 
        currentElement.getAttribute('data-step-type') === 'user_message') {
      const queryText = extractMessageText(currentElement);
      if (queryText && queryText.trim().length > 0) {
        console.log('Found user message via data-step-type:', queryText.substring(0, 50) + '...');
        return queryText;
      }
    }
    
    // Check for user message classes
    if (currentElement.classList.contains('user-message') || 
        currentElement.classList.contains('human-message')) {
      const queryText = extractMessageText(currentElement);
      if (queryText && queryText.trim().length > 0) {
        console.log('Found user message via class name:', queryText.substring(0, 50) + '...');
        return queryText;
      }
    }
    
    currentElement = currentElement.previousElementSibling;
  }
  
  // Strategy 2: Look in parent containers and traverse backwards
  let parentContainer = assistantMessageElement.parentElement;
  while (parentContainer && parentContainer !== document.body) {
    const userMessages = parentContainer.querySelectorAll('[data-step-type="user_message"], .user-message, .human-message');
    if (userMessages.length > 0) {
      // Get the last user message before our assistant message
      for (let i = userMessages.length - 1; i >= 0; i--) {
        const userMsg = userMessages[i];
        // Check if this user message comes before our assistant message in DOM order
        if (userMsg.compareDocumentPosition(assistantMessageElement) & Node.DOCUMENT_POSITION_FOLLOWING) {
          const queryText = extractMessageText(userMsg);
          if (queryText && queryText.trim().length > 0) {
            console.log('Found user message via parent traversal:', queryText.substring(0, 50) + '...');
            return queryText;
          }
        }
      }
    }
    parentContainer = parentContainer.parentElement;
  }
  
  // Strategy 3: Look for all messages in the chat and find the one immediately before
  const allMessages = document.querySelectorAll('[data-step-type], .message, [role="article"]');
  const messageArray = Array.from(allMessages);
  const assistantIndex = messageArray.indexOf(assistantMessageElement);
  
  if (assistantIndex > 0) {
    // Look backwards from the assistant message
    for (let i = assistantIndex - 1; i >= 0; i--) {
      const msg = messageArray[i];
      if (msg.hasAttribute('data-step-type') && 
          msg.getAttribute('data-step-type') === 'user_message') {
        const queryText = extractMessageText(msg);
        if (queryText && queryText.trim().length > 0) {
          console.log('Found user message via message array:', queryText.substring(0, 50) + '...');
          return queryText;
        }
      }
      
      // Also check by class names
      if (msg.classList.contains('user-message') || 
          msg.classList.contains('human-message')) {
        const queryText = extractMessageText(msg);
        if (queryText && queryText.trim().length > 0) {
          console.log('Found user message via class in array:', queryText.substring(0, 50) + '...');
          return queryText;
        }
      }
    }
  }
  
  // Strategy 4: Pattern matching - look for question patterns in any recent text
  const recentMessages = messageArray.slice(Math.max(0, assistantIndex - 5), assistantIndex);
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    const text = extractMessageText(msg);
    if (text && (text.includes('?') || text.toLowerCase().includes('what') || 
                 text.toLowerCase().includes('how') || text.toLowerCase().includes('why') ||
                 text.toLowerCase().includes('where') || text.toLowerCase().includes('when') ||
                 text.toLowerCase().includes('tell me') || text.toLowerCase().includes('explain'))) {
      console.log('Found potential question via pattern matching:', text.substring(0, 50) + '...');
      return text;
    }
  }
  
  console.error('Could not find preceding user message for retry');
  return null;
}

// Function to handle retry action
function retryQuery(queryText, retryButton) {
  console.log('Retrying query:', queryText.substring(0, 100) + '...');
  
  if (isRetryInProgress) {
    console.log('Retry already in progress, ignoring');
    return;
  }
  
  isRetryInProgress = true;
  currentRetryingButton = retryButton;
  
  // Set button to loading state
  setRetryButtonLoading(retryButton);
  
  try {
    // Find input field
    const inputField = findInputField();
    if (!inputField) {
      console.error('Could not find input field for retry');
      showRetryError(retryButton, 'Could not find input field');
      return;
    }
    
    // Clear existing content and set the query
    inputField.textContent = '';
    inputField.focus();
    
    // Set the query text in the input field
    inputField.textContent = queryText;
    
    // Trigger input events for React
    const inputEvent = new InputEvent('input', { 
      bubbles: true, 
      data: queryText,
      inputType: 'insertText'
    });
    inputField.dispatchEvent(inputEvent);
    
    // Also trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    inputField.dispatchEvent(changeEvent);
    
    console.log('Query text set in input field');
    
    // Find and click the send button after a short delay
    setTimeout(() => {
      const sendButton = findSendButton();
      if (sendButton) {
        sendButton.click();
        console.log('Retry query sent successfully');
        
        // Reset button after successful send
        setTimeout(() => {
          resetRetryButton(retryButton);
        }, 1000);
      } else {
        console.error('Could not find send button for retry');
        showRetryError(retryButton, 'Could not find send button');
      }
    }, 200);
    
  } catch (error) {
    console.error('Error in retryQuery:', error);
    showRetryError(retryButton, 'Failed to retry query');
  }
}

// Function to set retry button to loading state
function setRetryButtonLoading(button) {
  if (!button) return;
  
  button.classList.add('retrying');
  button.style.color = '#FFA500';
  button.style.opacity = '1';
  button.title = 'Retrying...';
  
  // Change to loading/spinner icon
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

// Function to reset retry button to normal state
function resetRetryButton(button) {
  if (!button) return;
  
  button.classList.remove('retrying', 'error');
  button.style.color = '#AE0F0A';
  button.style.opacity = '0.7';
  button.title = 'Retry this question';
  
  // Reset to refresh icon
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 4V10H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 20V14H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M3.51 15A9 9 0 0 0 18.36 18.36L23 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  
  // Reset global state
  if (currentRetryingButton === button) {
    currentRetryingButton = null;
    isRetryInProgress = false;
  }
}

// Function to show retry error state
function showRetryError(button, errorMessage) {
  if (!button) return;
  
  console.error('Retry error:', errorMessage);
  
  button.classList.add('error');
  button.classList.remove('retrying');
  button.style.color = '#dc2626';
  button.style.opacity = '1';
  button.title = 'Retry failed - click to try again';
  
  // Change to error icon
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
    </svg>
  `;
  
  // Reset to normal state after 3 seconds
  setTimeout(() => {
    resetRetryButton(button);
  }, 3000);
  
  // Reset global state
  if (currentRetryingButton === button) {
    currentRetryingButton = null;
    isRetryInProgress = false;
  }
}

// Function to remove duplicate retry buttons
function removeDuplicateRetryButtons() {
  // Find all message containers
  const messageSelectors = [
    '[data-step-type="assistant_message"]',
    '.message:not(.user-message):not([data-step-type="user_message"])',
    '.assistant-message',
    '.bot-message',
    '.ai-message'
  ];
  
  const processedMessages = new Set();
  
  messageSelectors.forEach(selector => {
    try {
      const messages = document.querySelectorAll(selector);
      messages.forEach(message => {
        // Skip if this element is a child of another message element
        let isChildOfAnotherMessage = false;
        let parent = message.parentElement;
        while (parent && parent !== document.body) {
          if (parent.hasAttribute('data-step-type') || 
              parent.classList.contains('message') ||
              parent.classList.contains('assistant-message') ||
              parent.classList.contains('bot-message') ||
              parent.classList.contains('ai-message')) {
            isChildOfAnotherMessage = true;
            break;
          }
          parent = parent.parentElement;
        }
        
        if (!isChildOfAnotherMessage && !processedMessages.has(message)) {
          processedMessages.add(message);
          
          // Find all retry buttons in this message
          const retryButtons = message.querySelectorAll('.retry-icon, .message-retry');
          
          if (retryButtons.length > 1) {
            console.log(`Found ${retryButtons.length} retry buttons in message, removing duplicates...`);
            
            // Keep only the last one (which should be at the end of the message)
            for (let i = 0; i < retryButtons.length - 1; i++) {
              retryButtons[i].remove();
            }
          }
        }
      });
    } catch (e) {
      console.log(`Selector failed: ${selector}`, e);
    }
  });
}
function getPreferredVoice() {
  const voices = speechSynthesis.getVoices();
  
  // Prefer English voices
  const englishVoices = voices.filter(voice => 
    voice.lang.startsWith('en') && 
    (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('male'))
  );
  
  if (englishVoices.length > 0) {
    return englishVoices[0];
  }
  
  // Fallback to any English voice
  const anyEnglish = voices.filter(voice => voice.lang.startsWith('en'));
  if (anyEnglish.length > 0) {
    return anyEnglish[0];
  }
  
  // Fallback to system default
  return voices[0] || null;
}

// Function to extract clean text from message element
function extractMessageText(messageElement) {
  if (!messageElement) return '';
  
  // Clone the element to avoid modifying the original
  const clone = messageElement.cloneNode(true);
  
  // Remove any existing speaker icons
  const existingIcons = clone.querySelectorAll('.speaker-icon, .message-speaker');
  existingIcons.forEach(icon => icon.remove());
  
  // Remove script tags, style tags, and other unwanted elements
  const unwantedElements = clone.querySelectorAll('script, style, .speaker-icon, .message-speaker');
  unwantedElements.forEach(el => el.remove());
  
  // Get text content and clean it up
  let text = clone.textContent || clone.innerText || '';
  
  // Clean up the text
  text = text.trim()
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/\n+/g, ' ')  // Replace newlines with space
    .replace(/\t+/g, ' ')  // Replace tabs with space
    .replace(/[^\w\s\.,!?;:'"()-]/g, ''); // Remove special characters except basic punctuation
  
  return text;
}

// Function to stop current speech
function stopCurrentSpeech() {
  if (currentSpeechUtterance) {
    speechSynthesis.cancel();
    currentSpeechUtterance = null;
  }
  
  if (currentSpeakingIcon) {
    resetSpeakerIcon(currentSpeakingIcon);
    currentSpeakingIcon = null;
  }
  
  isInitializingSpeech = false;
}

// Function to reset speaker icon to default state
function resetSpeakerIcon(icon) {
  if (!icon) return;
  
  icon.classList.remove('speaking', 'loading');
  icon.style.color = '#AE0F0A';
  icon.title = 'Click to read message aloud';
  
  // Reset the SVG to speaker icon
  icon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9V15H7L12 20V4L7 9H3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15.54 8.46C16.4731 9.39309 17.0001 10.6565 17.0001 11.9655C17.0001 13.2746 16.4731 14.538 15.54 15.471" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

// Function to set speaker icon to speaking state
function setSpeakerIconSpeaking(icon) {
  if (!icon) return;
  
  icon.classList.add('speaking');
  icon.classList.remove('loading');
  icon.style.color = '#FF6B6B';
  icon.title = 'Click to stop speech';
  
  // Change to stop/pause icon
  icon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
      <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
    </svg>
  `;
}

// Function to set speaker icon to loading state
function setSpeakerIconLoading(icon) {
  if (!icon) return;
  
  icon.classList.add('loading');
  icon.classList.remove('speaking');
  icon.style.color = '#FFA500';
  icon.title = 'Preparing speech...';
  
  // Change to loading/spinner icon
  icon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

// Function to speak message text
async function speakMessage(text, speakerIcon) {
  if (!text || text.trim().length === 0) {
    console.log('No text to speak');
    return;
  }
  
  // Check if speech synthesis is available
  if (!('speechSynthesis' in window)) {
    console.error('Speech synthesis not supported in this browser');
    return;
  }
  
  // Stop any current speech
  stopCurrentSpeech();
  
  // Set loading state
  isInitializingSpeech = true;
  currentSpeakingIcon = speakerIcon;
  setSpeakerIconLoading(speakerIcon);
  
  try {
    // Wait for voices to be loaded
    await new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve();
      } else {
        speechSynthesis.onvoiceschanged = () => {
          resolve();
        };
        // Timeout after 2 seconds
        setTimeout(resolve, 2000);
      }
    });
    
    if (!isInitializingSpeech) return; // User cancelled while loading
    
    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    const preferredVoice = getPreferredVoice();
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Set speech parameters
    utterance.rate = 1.0;  // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume
    
    // Set up event listeners
    utterance.onstart = () => {
      if (currentSpeakingIcon === speakerIcon) {
        setSpeakerIconSpeaking(speakerIcon);
        console.log('Speech started');
      }
    };
    
    utterance.onend = () => {
      if (currentSpeakingIcon === speakerIcon) {
        resetSpeakerIcon(speakerIcon);
        currentSpeechUtterance = null;
        currentSpeakingIcon = null;
        console.log('Speech ended');
      }
    };
    
    utterance.onerror = (event) => {
      console.log('Speech error:', event.error);
      // Don't show error for 'interrupted' - this is normal when user stops speech
      if (event.error !== 'interrupted') {
        console.error('Speech synthesis error:', event.error);
      }
      
      if (currentSpeakingIcon === speakerIcon) {
        resetSpeakerIcon(speakerIcon);
        currentSpeechUtterance = null;
        currentSpeakingIcon = null;
      }
    };
    
    utterance.onpause = () => {
      console.log('Speech paused');
    };
    
    utterance.onresume = () => {
      console.log('Speech resumed');
    };
    
    // Start speaking
    currentSpeechUtterance = utterance;
    speechSynthesis.speak(utterance);
    
    console.log('Speech initiated for text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
  } catch (error) {
    console.error('Error in speakMessage:', error);
    if (currentSpeakingIcon === speakerIcon) {
      resetSpeakerIcon(speakerIcon);
      currentSpeechUtterance = null;
      currentSpeakingIcon = null;
    }
  } finally {
    isInitializingSpeech = false;
  }
}

// Function to create and add speaker icon to a message
function addSpeakerIconToMessage(messageElement) {
  // Check if this is a chatbot message (not user message)
  const isAssistantMessage = messageElement.hasAttribute('data-step-type') && 
                           messageElement.getAttribute('data-step-type') === 'assistant_message';
  
  // Alternative check for chatbot messages (messages without user indicators)
  const isUserMessage = messageElement.hasAttribute('data-step-type') && 
                       messageElement.getAttribute('data-step-type') === 'user_message';
  
  // Only add to chatbot messages, not user messages
  if (isUserMessage || (!isAssistantMessage && messageElement.querySelector('.user-message, .human-message'))) {
    return false;
  }
  
  // Check if speaker icon already exists in this message or any of its children
  if (messageElement.querySelector('.speaker-icon, .message-speaker')) {
    return false;
  }
  
  // Extract text content
  const messageText = extractMessageText(messageElement);
  if (!messageText || messageText.trim().length === 0) {
    return false;
  }
  
  // Create message icons container
  const iconsContainer = document.createElement('span');
  iconsContainer.className = 'message-icons-container';
  iconsContainer.style.cssText = `
    display: inline-flex !important;
    align-items: center !important;
    gap: 2px !important;
    margin-left: 8px !important;
    vertical-align: middle !important;
    flex-shrink: 0 !important;
  `;
  
  // Create speaker icon
  const speakerIcon = document.createElement('button');
  speakerIcon.className = 'speaker-icon message-speaker';
  speakerIcon.setAttribute('aria-label', 'Read message aloud');
  speakerIcon.setAttribute('data-message-text', messageText);
  
  // Style the speaker icon
  speakerIcon.style.cssText = `
    background: transparent !important;
    border: none !important;
    color: #AE0F0A !important;
    cursor: pointer !important;
    padding: 4px !important;
    margin: 0 !important;
    border-radius: 4px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.2s ease !important;
    vertical-align: middle !important;
    flex-shrink: 0 !important;
    opacity: 0.7 !important;
    position: relative !important;
    top: -1px !important;
  `;
  
  // Set initial icon
  resetSpeakerIcon(speakerIcon);
  
  // Add hover effects for speaker icon
  speakerIcon.addEventListener('mouseenter', function() {
    if (!this.classList.contains('speaking') && !this.classList.contains('loading')) {
      this.style.opacity = '1';
      this.style.backgroundColor = 'rgba(174, 15, 10, 0.1)';
    }
  });
  
  speakerIcon.addEventListener('mouseleave', function() {
    if (!this.classList.contains('speaking') && !this.classList.contains('loading')) {
      this.style.opacity = '0.7';
      this.style.backgroundColor = 'transparent';
    }
  });
  
  // Add click event listener for speaker icon
  speakerIcon.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // If this icon is currently speaking, stop it
    if (currentSpeakingIcon === this && currentSpeechUtterance) {
      stopCurrentSpeech();
      return;
    }
    
    // If another icon is speaking, stop it and start this one
    if (currentSpeechUtterance) {
      stopCurrentSpeech();
    }
    
    // Start speaking this message
    const textToSpeak = this.getAttribute('data-message-text') || extractMessageText(messageElement);
    if (textToSpeak) {
      speakMessage(textToSpeak, this);
    }
  });
  
  // Create retry button
  const retryButton = createRetryButton(messageElement);
  
  // Add icons to container
  iconsContainer.appendChild(speakerIcon);
  if (retryButton) {
    iconsContainer.appendChild(retryButton);
  }
  
  // Find the absolute best place to insert the icons container - at the very end of the entire message
  let insertionPoint = null;
  
  // Strategy 1: Find the last text node or element that contains actual content
  const walker = document.createTreeWalker(
    messageElement,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip empty text nodes, script tags, style tags, and existing speaker/retry icons
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.classList.contains('speaker-icon') || 
              node.classList.contains('message-speaker') ||
              node.classList.contains('retry-icon') ||
              node.classList.contains('message-retry') ||
              node.classList.contains('message-icons-container') ||
              node.tagName === 'SCRIPT' || 
              node.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let lastContentNode = null;
  let currentNode;
  
  while (currentNode = walker.nextNode()) {
    if (currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent.trim()) {
      lastContentNode = currentNode;
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      // Check if this element has text content
      const textContent = currentNode.textContent.trim();
      if (textContent && !currentNode.querySelector('.speaker-icon, .message-speaker, .retry-icon, .message-retry, .message-icons-container')) {
        lastContentNode = currentNode;
      }
    }
  }
  
  // If we found the last content node, insert after it
  if (lastContentNode) {
    if (lastContentNode.nodeType === Node.TEXT_NODE) {
      // Insert after the text node
      const parentElement = lastContentNode.parentElement;
      if (parentElement) {
        insertionPoint = parentElement;
      }
    } else {
      // It's an element, append to it
      insertionPoint = lastContentNode;
    }
  }
  
  // Strategy 2: Fallback - find specific content areas
  if (!insertionPoint) {
    const contentSelectors = [
      '.message-content',
      '.message-text', 
      '.content',
      'div:last-child',
      'p:last-child'
    ];
    
    for (const selector of contentSelectors) {
      const contentElement = messageElement.querySelector(selector);
      if (contentElement && contentElement.textContent.trim()) {
        insertionPoint = contentElement;
        break;
      }
    }
  }
  
  // Strategy 3: Ultimate fallback - use the message element itself
  if (!insertionPoint) {
    insertionPoint = messageElement;
  }
  
  // Insert the icons container at the very end
  insertionPoint.appendChild(iconsContainer);
  
  console.log('Speaker icon and retry button added to message:', messageText.substring(0, 50) + '...');
  return true;
}

// Function to clean up duplicate speaker icons (keep only the last one per message)
function removeDuplicateSpeakerIcons() {
  // Find all message containers
  const messageSelectors = [
    '[data-step-type="assistant_message"]',
    '.message:not(.user-message):not([data-step-type="user_message"])',
    '.assistant-message',
    '.bot-message',
    '.ai-message'
  ];
  
  const processedMessages = new Set();
  
  messageSelectors.forEach(selector => {
    try {
      const messages = document.querySelectorAll(selector);
      messages.forEach(message => {
        // Skip if this element is a child of another message element
        let isChildOfAnotherMessage = false;
        let parent = message.parentElement;
        while (parent && parent !== document.body) {
          if (parent.hasAttribute('data-step-type') || 
              parent.classList.contains('message') ||
              parent.classList.contains('assistant-message') ||
              parent.classList.contains('bot-message') ||
              parent.classList.contains('ai-message')) {
            isChildOfAnotherMessage = true;
            break;
          }
          parent = parent.parentElement;
        }
        
        if (!isChildOfAnotherMessage && !processedMessages.has(message)) {
          processedMessages.add(message);
          
          // Find all speaker icons in this message
          const speakerIcons = message.querySelectorAll('.speaker-icon, .message-speaker');
          
          if (speakerIcons.length > 1) {
            console.log(`Found ${speakerIcons.length} speaker icons in message, removing duplicates...`);
            
            // Keep only the last one (which should be at the end of the message)
            for (let i = 0; i < speakerIcons.length - 1; i++) {
              speakerIcons[i].remove();
            }
          }
          
          // Also clean up duplicate icons containers
          const iconContainers = message.querySelectorAll('.message-icons-container');
          if (iconContainers.length > 1) {
            console.log(`Found ${iconContainers.length} icon containers in message, removing duplicates...`);
            
            // Keep only the last one
            for (let i = 0; i < iconContainers.length - 1; i++) {
              iconContainers[i].remove();
            }
          }
        }
      });
    } catch (e) {
      console.log(`Selector failed: ${selector}`, e);
    }
  });
}

// Function to add speaker icons to all existing chatbot messages
function addSpeakerIconsToExistingMessages() {
  // First, clean up any duplicates
  removeDuplicateSpeakerIcons();
  removeDuplicateRetryButtons();
  
  // Find all potential message elements - be more specific to avoid sub-elements
  const messageSelectors = [
    '[data-step-type="assistant_message"]',
    '.message:not(.user-message):not([data-step-type="user_message"])',
    '.assistant-message',
    '.bot-message',
    '.ai-message'
  ];
  
  const processedMessages = new Set();
  
  messageSelectors.forEach(selector => {
    try {
      const messages = document.querySelectorAll(selector);
      messages.forEach(message => {
        // Skip if this element is a child of another message element we might process
        let isChildOfAnotherMessage = false;
        let parent = message.parentElement;
        while (parent && parent !== document.body) {
          if (parent.hasAttribute('data-step-type') || 
              parent.classList.contains('message') ||
              parent.classList.contains('assistant-message') ||
              parent.classList.contains('bot-message') ||
              parent.classList.contains('ai-message')) {
            isChildOfAnotherMessage = true;
            break;
          }
          parent = parent.parentElement;
        }
        
        // Only process if it's not a child of another message and hasn't been processed
        if (!isChildOfAnotherMessage && !processedMessages.has(message)) {
          processedMessages.add(message);
          addSpeakerIconToMessage(message);
        }
      });
    } catch (e) {
      console.log(`Selector failed: ${selector}`, e);
    }
  });
  
  console.log(`Processed ${processedMessages.size} messages for speaker and retry icons`);
}

// ===== DEBUG FUNCTIONS =====

// Function to test speaker icons (for debugging)
function testSpeakerIcons() {
  console.log('Testing speaker icons and retry buttons...');
  addSpeakerIconsToExistingMessages();
  console.log('Speaker icons and retry buttons test completed');
}

// Function to clean up all speaker icons and retry buttons (for debugging)
function cleanupSpeakerIcons() {
  console.log('Cleaning up speaker icons and retry buttons...');
  
  // Stop any current speech
  stopCurrentSpeech();
  
  // Reset retry state
  if (currentRetryingButton) {
    resetRetryButton(currentRetryingButton);
  }
  
  // Remove all speaker icons and retry buttons
  const allIcons = document.querySelectorAll('.speaker-icon, .message-speaker, .retry-icon, .message-retry');
  allIcons.forEach(icon => icon.remove());
  
  // Remove all icon containers
  const allContainers = document.querySelectorAll('.message-icons-container');
  allContainers.forEach(container => container.remove());
  
  console.log(`Removed ${allIcons.length} icons and ${allContainers.length} containers`);
}

// Function to remove duplicate icons only (for debugging)
function removeDuplicateIcons() {
  console.log('Removing duplicate speaker and retry icons...');
  removeDuplicateSpeakerIcons();
  removeDuplicateRetryButtons();
  console.log('Duplicate removal completed');
}

// Function to test retry functionality (for debugging)
function testRetryButton(messageText = "What are the admission requirements for FUE?") {
  console.log('Testing retry functionality with query:', messageText);
  
  // Find the first retry button on the page
  const retryButton = document.querySelector('.retry-icon, .message-retry');
  if (retryButton) {
    // Simulate retry with custom query
    retryQuery(messageText, retryButton);
    console.log('Retry test initiated');
  } else {
    console.log('No retry button found on the page');
  }
}

// Function to test finding user messages (for debugging)
function testFindUserMessage() {
  console.log('Testing user message detection...');
  
  const assistantMessages = document.querySelectorAll('[data-step-type="assistant_message"]');
  if (assistantMessages.length === 0) {
    console.log('No assistant messages found');
    return;
  }
  
  assistantMessages.forEach((msg, index) => {
    console.log(`\n--- Assistant Message ${index + 1} ---`);
    const userQuery = findPrecedingUserMessage(msg);
    if (userQuery) {
      console.log('Found user query:', userQuery.substring(0, 100) + '...');
    } else {
      console.log('No user query found for this message');
    }
  });
}

// Function to list available voices (for debugging)
function listAvailableVoices() {
  const voices = speechSynthesis.getVoices();
  console.log('Available TTS voices:');
  voices.forEach((voice, index) => {
    console.log(`${index + 1}. ${voice.name} (${voice.lang}) - ${voice.default ? 'DEFAULT' : ''}`);
  });
  
  const preferred = getPreferredVoice();
  if (preferred) {
    console.log('Preferred voice:', preferred.name, '(' + preferred.lang + ')');
  }
  
  return voices;
}

// Function to test speech with custom text (for debugging)
function testSpeech(text = "Hello! This is a test of the text-to-speech functionality. How does it sound?") {
  console.log('Testing speech with text:', text);
  
  // Create a temporary icon for testing
  const testIcon = document.createElement('div');
  testIcon.style.display = 'none';
  document.body.appendChild(testIcon);
  
  speakMessage(text, testIcon);
  
  // Clean up test icon after 30 seconds
  setTimeout(() => {
    if (testIcon.parentNode) {
      testIcon.parentNode.removeChild(testIcon);
    }
  }, 30000);
}

// Make debug functions globally available
window.testSpeakerIcons = testSpeakerIcons;
window.cleanupSpeakerIcons = cleanupSpeakerIcons;
window.removeDuplicateIcons = removeDuplicateIcons;
window.testRetryButton = testRetryButton;
window.testFindUserMessage = testFindUserMessage;
window.listAvailableVoices = listAvailableVoices;
window.testSpeech = testSpeech;

// Main initialization function
function initializeAskNourCustomizations() {
  // Load external CSS styles first
  loadExternalStyles();
  
  addDirAutoToArticles();
  replaceOverflowClass();
  addFUEHeaderStyles();
  addFUEHeader();
  addFUEFooter();
  hideBuiltWithChainlit();

  // Delay chat input modification to ensure elements are loaded
  setTimeout(() => {
    addMicrophoneButton();
  }, 500);

  // Try again with a longer delay in case React takes time to render
  setTimeout(() => {
    addMicrophoneButton();
  }, 2000);

  // Initialize text-to-speech functionality
  setTimeout(() => {
    addSpeakerIconsToExistingMessages();
  }, 1000);

  // Add global event delegation for new chat buttons
  setTimeout(() => {
    addGlobalNewChatButtonHandlers();
  }, 1000);

  // Run hideBuiltWithChainlit periodically to catch late-loading elements
  setInterval(() => {
    hideBuiltWithChainlit();
  }, 2000);
}

// Function to add global event handlers for new chat buttons
function addGlobalNewChatButtonHandlers() {
  // Use event delegation on the document to catch clicks on new chat buttons
  document.addEventListener('click', function(e) {
    // Check if the clicked element is a new chat button
    if (e.target.id === 'header-new-chat-button' || 
        e.target.id === 'mobile-new-chat-button' ||
        e.target.closest('#header-new-chat-button') ||
        e.target.closest('#mobile-new-chat-button')) {
      
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Global new chat button handler triggered');
      console.log('Button clicked:', e.target.id || e.target.closest('[id]')?.id);
      
      // Close mobile menu if it's open
      const mobileMenu = document.querySelector('#mobile-menu');
      if (mobileMenu && mobileMenu.classList.contains('show')) {
        const closeMobileMenuEvent = new Event('closeMobileMenu');
        document.dispatchEvent(closeMobileMenuEvent);
        
        // Use the closeMobileMenu function if available
        if (typeof closeMobileMenu === 'function') {
          closeMobileMenu();
        } else {
          mobileMenu.classList.remove('show');
          const hamburgerBtn = document.querySelector('#navbar-hamburger');
          if (hamburgerBtn) {
            hamburgerBtn.classList.remove('active');
          }
          document.body.style.overflow = "";
        }
      }
      
      // Reload the page to start a new chat
      console.log('Reloading page for new chat...');
      window.location.reload();
      
      return false;
    }
  }, true); // Use capture phase to ensure we catch the event
  
  console.log('Global new chat button handlers added');
}


// Run the function when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeAskNourCustomizations);

// Also run when new content is dynamically added
const observer = new MutationObserver((mutations) => {
  let shouldUpdateHeader = false;
  let shouldUpdateFooter = false;
  let shouldUpdateChatLayout = false;
  let shouldAddSpeakerIcons = false;

  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check for header changes
          if (node.querySelector && (node.querySelector('#header') || node.id === 'header')) {
            shouldUpdateHeader = true;
          }
          
          // Check for footer area changes
          if (node.querySelector && node.querySelector('#message-composer')) {
            shouldUpdateFooter = true;
            shouldUpdateChatLayout = true;
          }
          
          // Check for chat layout changes
          if (node.classList && (node.classList.contains('chat-container') || node.classList.contains('message-composer'))) {
            shouldUpdateChatLayout = true;
          }
          
          // Check for new messages that need speaker icons
          if (node.hasAttribute && (
            node.hasAttribute('data-step-type') || 
            node.querySelector('[data-step-type]') ||
            node.classList.contains('message') ||
            node.querySelector('.message') ||
            node.hasAttribute('role') && node.getAttribute('role') === 'article'
          )) {
            shouldAddSpeakerIcons = true;
          }
          
          // Check for authentication success messages to show sidebar
          const messageText = node.textContent || '';
          if ((messageText.includes('✅ Registration successful!') || 
               messageText.includes('✅ Login successful!')) &&
              !document.querySelector('#auth-sidebar')) {
            console.log('Authentication success detected in main observer');
            setTimeout(() => {
              showAuthenticatedSidebar();
            }, 1000);
          }
        }
      });
    }
  });

  if (shouldUpdateHeader) {
    setTimeout(() => {
      addFUEHeader();
    }, 100);
  }

  if (shouldUpdateFooter) {
    setTimeout(() => {
      addFUEFooter();
    }, 100);
  }

  if (shouldUpdateChatLayout) {
    setTimeout(() => {
      addMicrophoneButton();
    }, 100);
  }

  if (shouldAddSpeakerIcons) {
    setTimeout(() => {
      addSpeakerIconsToExistingMessages();
    }, 200); // Slight delay to ensure message content is fully rendered
  }

  addDirAutoToArticles();
  replaceOverflowClass(); // Run on every mutation to catch new elements
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// ===== INITIALIZE AUTHENTICATION POPUP =====
// Initialize authentication popup when DOM is ready
function initializeAuthentication() {
  console.log("Initializing authentication...");
  
  // Check for stored authentication state
  if (checkStoredAuthState()) {
    console.log("User is already authenticated, showing sidebar");
    // Wait a bit for the page to load, then show sidebar
    setTimeout(() => {
      showAuthenticatedSidebar();
    }, 1000);
  } else {
    // Start detecting authentication state from chat messages
    detectAuthenticationState();
    // Show authentication popup for non-authenticated users
    showInitialAuthenticationPopup();
  }
  
  addMicrophoneButton();
}

// Make logout function globally available
window.handleLogout = handleLogout;
window.toggleSidebar = toggleSidebar;
window.toggleSidebarCollapse = toggleSidebarCollapse;
window.askSampleQuestion = askSampleQuestion;

// Debug functions for testing
window.testShowSidebar = function() {
  console.log('Testing sidebar display...');
  isUserAuthenticated = true;
  currentUserData.name = 'Test User';
  showAuthenticatedSidebar();
};

window.testHideSidebar = function() {
  console.log('Testing sidebar hide...');
  handleLogout();
};

window.checkAuthState = function() {
  console.log('Authentication State:', {
    isUserAuthenticated,
    authenticationChoice,
    currentUserData,
    hasSidebar: !!document.querySelector('#auth-sidebar')
  });
};

// Debug functions for new chat button
window.testNewChatButton = function() {
  console.log('Testing new chat button functionality...');
  
  const headerButton = document.querySelector('#header-new-chat-button');
  const mobileButton = document.querySelector('#mobile-new-chat-button');
  
  console.log('Header button found:', !!headerButton);
  console.log('Mobile button found:', !!mobileButton);
  
  if (headerButton) {
    console.log('Header button element:', headerButton);
    console.log('Header button onclick:', headerButton.onclick);
    console.log('Header button event listeners:', getEventListeners ? getEventListeners(headerButton) : 'Event listener inspection not available');
  }
  
  if (mobileButton) {
    console.log('Mobile button element:', mobileButton);
    console.log('Mobile button onclick:', mobileButton.onclick);
    console.log('Mobile button event listeners:', getEventListeners ? getEventListeners(mobileButton) : 'Event listener inspection not available');
  }
};

window.clickNewChatButton = function(buttonType = 'header') {
  console.log(`Attempting to click ${buttonType} new chat button...`);
  
  const buttonId = buttonType === 'mobile' ? '#mobile-new-chat-button' : '#header-new-chat-button';
  const button = document.querySelector(buttonId);
  
  if (button) {
    console.log('Button found, clicking...');
    button.click();
  } else {
    console.log('Button not found:', buttonId);
  }
};

window.forceNewChat = function() {
  console.log('Force starting new chat by reloading page...');
  window.location.reload();
};

// Function to check authentication status
function isAuth() {
  console.log('Authentication status:', isUserAuthenticated);
  return isUserAuthenticated;
}

// Make isAuth available globally
window.isAuth = isAuth;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAuthentication);
} else {
  // DOM is already loaded
  initializeAuthentication();
}
