(function () {
  let sidebarVisible = false;

  function initializeMem0Sidebar() {
    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "toggleSidebar") {
        chrome.storage.sync.get(["apiKey", "access_token"], function (data) {
          if (data.apiKey || data.access_token) {
            toggleSidebar();
          } else {
            chrome.runtime.sendMessage({ action: "openPopup" });
          }
        });
      }
    });
  }

  function toggleSidebar() {
    let sidebar = document.getElementById("mem0-sidebar");
    if (sidebar) {
      // If sidebar exists, toggle its visibility
      sidebarVisible = !sidebarVisible;
      sidebar.style.right = sidebarVisible ? "0px" : "-450px";

      // Add or remove click listener based on sidebar visibility
      if (sidebarVisible) {
        document.addEventListener("click", handleOutsideClick);
        document.addEventListener("keydown", handleEscapeKey); // Add this line
        fetchAndDisplayMemories(); // Fetch and display memories when sidebar is opened
      } else {
        document.removeEventListener("click", handleOutsideClick);
        document.removeEventListener("keydown", handleEscapeKey); // Add this line
      }
    } else {
      // If sidebar doesn't exist, create it
      createSidebar();
      sidebarVisible = true;
      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("keydown", handleEscapeKey); // Add this line
      fetchAndDisplayMemories(); // Fetch and display memories when sidebar is created
    }
  }

  // Add this new function
  function handleEscapeKey(event) {
    if (event.key === "Escape") {
      const searchInput = document.querySelector(".search-memory");
      const addInput = document.querySelector(".add-memory");

      if (searchInput) {
        closeSearchInput();
      } else if (addInput) {
        closeAddMemoryInput();
      } else {
        toggleSidebar();
      }
    }
  }

  function handleOutsideClick(event) {
    let sidebar = document.getElementById("mem0-sidebar");
    if (
      sidebar &&
      !sidebar.contains(event.target) &&
      !event.target.closest(".mem0-toggle-btn")
    ) {
      toggleSidebar();
    }
  }

  function createSidebar() {
    if (document.getElementById("mem0-sidebar")) {
      return;
    }

    const sidebarContainer = document.createElement("div");
    sidebarContainer.id = "mem0-sidebar";
    sidebarContainer.style.cssText = `
        position: fixed; 
        top: 10px;
        right: -400px;
        color: #000;
        width: 400px;
        height: calc(100vh - 20px);
        background-color: #ffffff;
        z-index: 2147483647;
        box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
        transition: right 0.3s ease-in-out;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        padding: 0;
        box-sizing: border-box;
        overflow-y: auto;
        border-radius: 10px;
        margin-right: 10px;
      `;

    // Create fixed header
    const fixedHeader = document.createElement("div");
    fixedHeader.className = "fixed-header";
    const iconPath = (iconName) => chrome.runtime.getURL(`icons/${iconName}`);
    fixedHeader.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
          <div class="logo-container">
            <img src="${iconPath(
              "mem0-logo.png"
            )}" alt="Mem0 Logo" class="logo">
          </div>
          <div class="header-buttons">
            <button id="searchBtn" class="header-icon-button" title="Search Memories">
              <img src="${iconPath(
                "search.svg"
              )}" alt="Search" class="svg-icon">
            </button>
            <button id="addMemoryBtn" class="header-icon-button" title="Add Memory">
              <img src="${iconPath(
                "add.svg"
              )}" alt="Add Memory" class="svg-icon">
            </button>
            <button id="ellipsisMenuBtn" class="header-icon-button" title="More options">
              <img src="${iconPath(
                "ellipsis.svg"
              )}" alt="More options" class="svg-icon">
            </button>
          </div>
        </div>
      `;

    // Create a container for search and add inputs
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    fixedHeader.appendChild(inputContainer);

    sidebarContainer.appendChild(fixedHeader);

    // Create ellipsis menu
    // Note: The settings button was added here in a previous step, ensure it's present.
    const ellipsisMenu = document.createElement("div");
    ellipsisMenu.id = "ellipsisMenu";
    ellipsisMenu.className = "ellipsis-menu";
    ellipsisMenu.innerHTML = `
        <button id="settingsBtn">Settings</button>
        <button id="openDashboardBtn">Open Dashboard</button>
        <button id="logoutBtn">Logout</button>
      `;
    fixedHeader.appendChild(ellipsisMenu);

    // Create scroll area with loading indicator
    const scrollArea = document.createElement("div");
    scrollArea.className = "scroll-area";
    scrollArea.innerHTML = `
        <div class="loading-indicator">
          <div class="loader"></div><br/>
          <p style="font-size: 12px; color: #888;">Loading memories...</p>
        </div>
      `;
    sidebarContainer.appendChild(scrollArea);

    fetchAndDisplayMemories();

    const searchBtn = fixedHeader.querySelector("#searchBtn");
    searchBtn.addEventListener("click", toggleSearch);

    const addMemoryBtn = fixedHeader.querySelector("#addMemoryBtn");
    addMemoryBtn.addEventListener("click", addNewMemory);

    const ellipsisMenuBtn = fixedHeader.querySelector("#ellipsisMenuBtn");
    ellipsisMenuBtn.addEventListener("click", toggleEllipsisMenu);

    const settingsBtn = ellipsisMenu.querySelector("#settingsBtn");
    settingsBtn.addEventListener("click", showSettingsView);

    const openDashboardBtn = ellipsisMenu.querySelector("#openDashboardBtn");
    openDashboardBtn.addEventListener("click", openDashboard);

    const logoutBtn = ellipsisMenu.querySelector("#logoutBtn");
    logoutBtn.addEventListener("click", logout);

    const footerToggle = document.createElement("div");
    footerToggle.className = "footer-toggle";
    footerToggle.innerHTML = `
      <span class="shortcut-text">Mem0 Shortcut: ^ + M</span>
      <div class="toggle-container">
        <span class="toggle-text">Memory enabled</span>
        <label class="switch">
          <input type="checkbox" id="mem0Toggle">
          <span class="slider round"></span>
        </label>
      </div>
    `;
    chrome.storage.sync.get(["memory_enabled"], function (result) {
      const toggleCheckbox = footerToggle.querySelector("#mem0Toggle");
      toggleCheckbox.checked = result.memory_enabled !== false;
      const toggleText = footerToggle.querySelector(".toggle-text");
      toggleText.textContent = toggleCheckbox.checked
        ? "Memory enabled"
        : "Memory disabled";
    });
    sidebarContainer.appendChild(footerToggle);

    const toggleCheckbox = footerToggle.querySelector("#mem0Toggle");
    const toggleText = footerToggle.querySelector(".toggle-text");
    toggleCheckbox.addEventListener("change", function () {
      toggleText.textContent = this.checked
        ? "Memory enabled"
        : "Memory disabled";
      chrome.storage.sync.get(["memory_enabled", "apiKey", "access_token"], function (data) {
        const headers = getHeaders(data.apiKey, data.access_token);
        fetch(`https://api.mem0.ai/v1/extension/`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            event_type: "extension_toggle_button",
            additional_data: { "status": data.memory_enabled },
          }),
        }).catch(error => {
          console.error("Error sending toggle event:", error);
        });
      });
      chrome.runtime.sendMessage({
        action: "toggleMem0",
        enabled: this.checked,
      });
      chrome.storage.sync.set({ memory_enabled: this.checked });
    });

    document.body.appendChild(sidebarContainer);

    setTimeout(() => {
      sidebarContainer.style.right = "0";
    }, 0);

    sidebarContainer.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    // Link to the external CSS file
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = chrome.runtime.getURL("sidebar.css");
    document.head.appendChild(link);
  }

  function fetchAndDisplayMemories(newMemory = false) {
    chrome.storage.sync.get(
      ["apiKey", "userId", "access_token"],
      function (data) {
        if (data.apiKey || data.access_token) {
          const headers = getHeaders(data.apiKey, data.access_token);
          fetch(`https://api.mem0.ai/v1/memories/?user_id=${data.userId}`, {
            method: "GET",
            headers: headers,
          })
            .then((response) => response.json())
            .then((data) => {
              data.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
              );
              displayMemories(data);
              if (newMemory) {
                const scrollArea = document.querySelector(".scroll-area");
                if (scrollArea) {
                  scrollArea.scrollTop = 0;
                  const newMemoryElement = scrollArea.firstElementChild;
                  if (newMemoryElement) {
                    newMemoryElement.classList.add("highlight");
                    newMemoryElement.scrollIntoView({ behavior: "smooth" });
                    setTimeout(() => {
                      newMemoryElement.classList.remove("highlight");
                    }, 750);
                  }
                }
              }
            })
            .catch((error) => {
              console.error("Error fetching memories:", error);
              const scrollArea = document.querySelector(".scroll-area");
              scrollArea.innerHTML = "<p>Error fetching memories</p>";
            });
        } else {
          const scrollArea = document.querySelector(".scroll-area");
          scrollArea.innerHTML = "<p>Please set up your API key or log in</p>";
        }
      }
    );
  }

  function displayMemories(memories) {
    const scrollArea = document.querySelector(".scroll-area");
    scrollArea.innerHTML = "";

    const searchBtn = document.getElementById("searchBtn");
    if (memories.length === 0) {
      searchBtn.style.display = "none";
      scrollArea.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; padding: 0px 15px 15px 15px; text-align: center;">
          <p>No memories found</p><br/>
          <p style="color: grey;">Click the + button to add a new memory or use Mem0 with the AI chatbot of your choice.</p>
        </div>
      `;
    } else {
      searchBtn.style.display = "flex";
      memories.forEach((memoryItem) => {
        const memoryElement = document.createElement("div");
        memoryElement.className = "memory-item";

        const createdAt = new Date(memoryItem.created_at);
        const formattedDate = createdAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        const allCategories = [
          ...(memoryItem.categories || []),
          ...(memoryItem.custom_categories || []),
        ];
        const categoryHtml =
          allCategories.length > 0
            ? `<div class="categories">${allCategories
                .map((cat) => `<span class="category">${cat}</span>`)
                .join("")}</div>`
            : "";

        const provider =
          memoryItem.metadata && memoryItem.metadata.provider
            ? memoryItem.metadata.provider.toLowerCase()
            : "mem0";

        const iconPath = (iconName) =>
          chrome.runtime.getURL(`icons/${iconName}`);

        const providerIcons = {
          chatgpt: "chatgpt.png",
          claude: "claude.png",
          perplexity: "perplexity.png",
          mem0: "mem0-claude-icon-purple.png",
          grok: "grok.svg",
        };

        const providerIcon =
          providerIcons[provider] || "mem0-claude-icon-purple.png";

        memoryElement.innerHTML = `
          <div class="memory-content">
            <div class="memory-top">
              <span class="memory-text">${memoryItem.memory}</span>
              <div class="memory-buttons">
                <button class="icon-button edit-btn" data-id="${memoryItem.id}">
                  <img src="${iconPath(
                    "edit.svg"
                  )}" alt="Edit" class="svg-icon">
                </button>
                <button class="icon-button delete-btn" data-id="${
                  memoryItem.id
                }">
                  <img src="${iconPath(
                    "delete.svg"
                  )}" alt="Delete" class="svg-icon">
                </button>
              </div>
            </div>
            <div class="memory-bottom">
              <div class="memory-categories">
                <img src="${iconPath(
                  providerIcon
                )}" alt="${provider}" class="provider-icon" style="width: 16px; height: 16px; margin-right: 5px;">
                ${categoryHtml}
              </div>
              <div class="memory-date">${formattedDate}</div>
            </div>
          </div>
        `;
        scrollArea.appendChild(memoryElement);

        const editBtn = memoryElement.querySelector(".edit-btn");
        const deleteBtn = memoryElement.querySelector(".delete-btn");

        editBtn.addEventListener("click", () =>
          editMemory(memoryItem.id, memoryElement)
        );
        deleteBtn.addEventListener("click", () =>
          deleteMemory(memoryItem.id, memoryElement)
        );
      });
    }
  }

  function getHeaders(apiKey, accessToken) {
    const headers = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Token ${apiKey}`;
    } else if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return headers;
  }

  function editMemory(memoryId, memoryElement) {
    const memoryText = memoryElement.querySelector(".memory-text");
    const editBtn = memoryElement.querySelector(".edit-btn");

    if (editBtn.classList.contains("editing")) {
      saveEditedMemory();
    } else {
      memoryText.contentEditable = "true";
      memoryText.classList.add("editing");
      memoryText.setAttribute(
        "data-original-content",
        memoryText.textContent.trim()
      );
      const iconPath = (iconName) => chrome.runtime.getURL(`icons/${iconName}`);
      editBtn.innerHTML = `<img src="${iconPath(
        "done.svg"
      )}" alt="Done" class="svg-icon">`;
      editBtn.classList.add("editing");

      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(memoryText);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      memoryText.focus();

      memoryText.addEventListener("keydown", handleEnterKey);
    }

    function handleEnterKey(event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        saveEditedMemory();
      }
    }

    function saveEditedMemory() {
      const newContent = memoryText.textContent.trim();
      const originalContent = memoryText.getAttribute("data-original-content");

      if (newContent === originalContent) {
        exitEditMode();
        return;
      }

      chrome.storage.sync.get(["apiKey", "access_token"], function (data) {
        const headers = getHeaders(data.apiKey, data.access_token);

        editBtn.innerHTML = `<div class="loader"></div>`;
        editBtn.disabled = true;

        fetch(`https://api.mem0.ai/v1/extension/`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ event_type: "extension_edit_event" }),
        }).catch(error => {
          console.error("Error sending edit event:", error);
        });

        fetch(`https://api.mem0.ai/v1/memories/${memoryId}/`, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify({ text: newContent }),
        })
          .then((response) => {
            if (response.ok) {
              exitEditMode();
            } else {
              console.error("Failed to update memory");
            }
          })
          .catch((error) => {
            console.error("Error updating memory:", error);
          })
          .finally(() => {
            editBtn.disabled = false;
          });
      });
    }

    function exitEditMode() {
      editBtn.innerHTML = `<img src="${chrome.runtime.getURL(
        "icons/edit.svg"
      )}" alt="Edit" class="svg-icon">`;
      editBtn.classList.remove("editing");
      memoryText.contentEditable = "false";
      memoryText.classList.remove("editing");
      memoryText.removeAttribute("data-original-content");
      memoryText.removeEventListener("keydown", handleEnterKey);
    }
  }

  function deleteMemory(memoryId, memoryElement) {
    const deleteBtn = memoryElement.querySelector(".delete-btn");
    const originalContent = deleteBtn.innerHTML;

    deleteBtn.innerHTML = `
      <div style="
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        animation: spin 1s linear infinite;
      "></div>
    `;
    deleteBtn.disabled = true;

    chrome.storage.sync.get(["apiKey", "access_token"], function (data) {
      const headers = getHeaders(data.apiKey, data.access_token);

      fetch(`https://api.mem0.ai/v1/extension/`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ event_type: "extension_delete_event" }),
      }).catch(error => {
        console.error("Error sending delete event:", error);
      });

      fetch(`https://api.mem0.ai/v1/memories/${memoryId}/`, {
        method: "DELETE",
        headers: headers,
      })
        .then((response) => {
          if (response.ok) {
            memoryElement.remove();
            const scrollArea = document.querySelector(".scroll-area");
            if (scrollArea.children.length === 0) {
              scrollArea.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; padding: 0px 15px 15px 15px; text-align: center;">
          <p>No memories found</p><br/>
          <p style="color: grey;">Click the + button to add a new memory or use Mem0 with the AI chatbot of your choice.</p>
        </div>
              `;
            }
          } else {
            console.error("Failed to delete memory");
            deleteBtn.innerHTML = originalContent;
            deleteBtn.disabled = false;
          }
        })
        .catch((error) => {
          console.error("Error deleting memory:", error);
          deleteBtn.innerHTML = originalContent;
          deleteBtn.disabled = false;
        });
    });
  }

  function toggleSearch() {
    const inputContainer = document.querySelector(".input-container");
    const existingSearchInput = inputContainer.querySelector(".search-memory");
    const searchBtn = document.getElementById("searchBtn");
    const addMemoryBtn = document.getElementById("addMemoryBtn");

    const existingAddInput = inputContainer.querySelector(".add-memory");
    if (existingAddInput) {
      existingAddInput.remove();
      addMemoryBtn.classList.remove("active");
    }

    if (existingSearchInput) {
      closeSearchInput();
    } else {
      const searchMemoryInput = document.createElement("div");
      searchMemoryInput.className = "search-memory";
      searchMemoryInput.innerHTML = `
        <div class="search-container">
          <img src="${chrome.runtime.getURL(
            "icons/search.svg"
          )}" alt="Search" class="search-icon">
          <span contenteditable="true" placeholder="Search memories..."></span>
        </div>
      `;

      inputContainer.appendChild(searchMemoryInput);

      const searchMemorySpan = searchMemoryInput.querySelector("span");
      searchMemorySpan.focus();
      searchMemorySpan.style.color = "black";

      searchMemorySpan.addEventListener("input", function () {
        const searchTerm = this.textContent.trim().toLowerCase();
        filterMemories(searchTerm);
      });
      searchBtn.classList.add("active");
    }
  }

  function closeSearchInput() {
    const inputContainer = document.querySelector(".input-container");
    const existingSearchInput = inputContainer.querySelector(".search-memory");
    const searchBtn = document.getElementById("searchBtn");

    if (existingSearchInput) {
      existingSearchInput.remove();
      searchBtn.classList.remove("active");
      filterMemories("");
    }
  }

  function filterMemories(searchTerm) {
    const memoryItems = document.querySelectorAll(".memory-item");
    memoryItems.forEach((item) => {
      const memoryText = item
        .querySelector(".memory-text")
        .textContent.toLowerCase();
      if (memoryText.includes(searchTerm)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
    document.getElementById("mem0-sidebar").style.width = "400px";
  }

  function addNewMemory() {
    const inputContainer = document.querySelector(".input-container");
    const existingAddInput = inputContainer.querySelector(".add-memory");
    const addMemoryBtn = document.getElementById("addMemoryBtn");

    const existingSearchInput = inputContainer.querySelector(".search-memory");
    if (existingSearchInput) {
      closeSearchInput();
    }

    if (existingAddInput) {
      closeAddMemoryInput();
    } else {
      const addMemoryInput = document.createElement("div");
      addMemoryInput.className = "add-memory";
      addMemoryInput.innerHTML = `
        <div class="add-container">
          <img src="${chrome.runtime.getURL(
            "icons/add.svg"
          )}" alt="Add" class="add-icon">
          <span contenteditable="true" placeholder="Add a new memory..."></span>
        </div>
      `;
      inputContainer.appendChild(addMemoryInput);
      const addMemorySpan = addMemoryInput.querySelector("span");
      addMemorySpan.focus();
      addMemorySpan.style.color = "black";
      addMemorySpan.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          const newContent = this.textContent.trim();
          if (newContent) {
            saveNewMemory(newContent, addMemoryInput);
          } else {
            closeAddMemoryInput();
          }
        }
      });
      addMemoryBtn.classList.add("active");
    }
  }

  function closeAddMemoryInput() {
    const inputContainer = document.querySelector(".input-container");
    const existingAddInput = inputContainer.querySelector(".add-memory");
    const addMemoryBtn = document.getElementById("addMemoryBtn");

    if (existingAddInput) {
      existingAddInput.remove();
      addMemoryBtn.classList.remove("active");
    }
  }

  function saveNewMemory(newContent, addMemoryInput) {
    chrome.storage.sync.get(
      ["apiKey", "access_token", "userId"],
      function (data) {
        const headers = getHeaders(data.apiKey, data.access_token);
        addMemoryInput.innerHTML = `
          <div class="loading-indicator" style="width: 100%; display: flex; justify-content: center; align-items: center;">
            <div class="loader"></div>
          </div>
        `;
        fetch(`https://api.mem0.ai/v1/extension/`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ event_type: "extension_add_event" }),
        }).catch(error => {
          console.error("Error sending add event:", error);
        });
        fetch("https://api.mem0.ai/v1/memories/", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            messages: [{ role: "user", content: newContent }],
            user_id: data.userId,
            infer: false,
            metadata: {
              provider: "Mem0",
            },
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            addMemoryInput.remove();
            fetchAndDisplayMemories(true);
          })
          .catch((error) => {
            console.error("Error adding memory:", error);
            addMemoryInput.remove();
          })
          .finally(() => {
            document.getElementById("addMemoryBtn").classList.remove("active");
          });
      }
    );
  }

  /**
   * Returns the HTML string for the settings view.
   * @returns {string} HTML string for the settings view.
   */
  function _getSettingsViewHTML() {
    return `
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <button id="backToMemoriesBtn" class="header-icon-button" style="margin-right: 10px;" title="Back to Memories">
          <img src="${chrome.runtime.getURL("icons/back-arrow.svg")}" alt="Back" class="svg-icon" style="width: 20px; height: 20px;">
        </button>
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">Settings</h2>
      </div>

      <h4 style="font-size: 15px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">API Key</h4>
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <input type="password" id="apiKeyInput" placeholder="Enter your API Key" class="settings-input" style="flex-grow: 1; margin-right: 5px;">
        <button id="toggleApiKeyVisibilityBtn" class="settings-button" style="margin-right: 5px;">Show</button>
        <button id="saveApiKeyBtn" class="settings-button">Save</button>
      </div>

      <h4 style="font-size: 15px; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Preferences</h4>
      <div class="settings-preference-item">
        <label for="enterKeyToggle" style="display: flex; align-items: center; justify-content: space-between; width: 100%; cursor: pointer;">
          <span style="font-size: 14px;">Enable Enter-Key for Memory (ChatGPT)</span>
          <label class="switch" style="margin-left: 10px;">
            <input type="checkbox" id="enterKeyToggle">
            <span class="slider round"></span>
          </label>
        </label>
      </div>
      <p id="settingsStatus" style="font-size: 12px; color: green; margin-top: 15px; text-align: center; min-height: 18px;"></p>
    `;
  }

  function showSettingsView() {
    const sidebarContainer = document.getElementById("mem0-sidebar");
    const scrollArea = sidebarContainer.querySelector(".scroll-area");
    const inputContainer = sidebarContainer.querySelector(".input-container");
    let settingsView = document.getElementById("mem0-settings-view");

    if (scrollArea) scrollArea.style.display = "none";
    if (inputContainer) inputContainer.style.display = "none";
    const ellipsisMenu = document.getElementById("ellipsisMenu");
    if (ellipsisMenu) ellipsisMenu.style.display = "none";

    if (!settingsView) {
      settingsView = document.createElement("div");
      settingsView.id = "mem0-settings-view";
      settingsView.style.padding = "15px";
      settingsView.style.width = "100%";
      settingsView.style.boxSizing = "border-box";
      settingsView.style.color = "#333";
      settingsView.innerHTML = _getSettingsViewHTML();

      const fixedHeader = sidebarContainer.querySelector(".fixed-header");
      if (fixedHeader) {
        fixedHeader.insertAdjacentElement("afterend", settingsView);
      } else {
        sidebarContainer.appendChild(settingsView);
      }

      document.getElementById("backToMemoriesBtn").addEventListener("click", showMemoriesView);
      document.getElementById("saveApiKeyBtn").addEventListener("click", saveApiKey);
      document.getElementById("toggleApiKeyVisibilityBtn").addEventListener("click", toggleApiKeyVisibility);
      document.getElementById("enterKeyToggle").addEventListener("change", saveEnterKeyPreference);
    }

    settingsView.style.display = "block";
    loadSettingsValues();
  }

  function showMemoriesView() {
    const sidebarContainer = document.getElementById("mem0-sidebar");
    const scrollArea = sidebarContainer.querySelector(".scroll-area");
    const inputContainer = sidebarContainer.querySelector(".input-container");
    const settingsView = document.getElementById("mem0-settings-view");

    if (settingsView) settingsView.style.display = "none";
    if (scrollArea) scrollArea.style.display = "block";
    if (inputContainer) inputContainer.style.display = "block";

    fetchAndDisplayMemories();
  }

  /**
   * Loads settings values from chrome.storage.sync and populates the
   * settings view fields.
   * The API key is fetched and displayed, initially masked (as type="password").
   */
  function loadSettingsValues() {
    const apiKeyInput = document.getElementById("apiKeyInput");
    chrome.storage.sync.get(["apiKey", "enterKeyInterceptionEnabled"], function (data) {
      if (data.apiKey) {
        apiKeyInput.value = data.apiKey;
      }
      const enterKeyToggle = document.getElementById("enterKeyToggle");
      enterKeyToggle.checked = data.enterKeyInterceptionEnabled !== false;
    });
  }

  /**
   * Saves the user's Mem0 API key to chrome.storage.sync.
   * API keys are sensitive credentials.
   * Note: chrome.storage.sync may sync this key if the user has browser sync enabled.
   */
  function saveApiKey() {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const newApiKey = apiKeyInput.value.trim();
    const settingsStatus = document.getElementById("settingsStatus");

    if (newApiKey) {
      chrome.storage.sync.set({ apiKey: newApiKey }, function () {
        settingsStatus.textContent = "API Key saved successfully!";
        setTimeout(() => settingsStatus.textContent = "", 3000);
      });
    } else {
      settingsStatus.textContent = "API Key cannot be empty.";
      settingsStatus.style.color = "red";
      setTimeout(() => {
        settingsStatus.textContent = "";
        settingsStatus.style.color = "green";
      }, 3000);
    }
  }

  /**
   * Toggles the visibility of the API key in the settings input field
   * between "password" and "text" type.
   * Displays a warning when the key is made visible, as this can be a security
   * risk if the user's screen is being observed (e.g., via screen sharing
   * or shoulder surfing).
   */
  function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const toggleBtn = document.getElementById("toggleApiKeyVisibilityBtn");
    const settingsStatus = document.getElementById("settingsStatus");

    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      toggleBtn.textContent = "Hide";
      settingsStatus.textContent = "Warning: API key is now visible.";
      settingsStatus.style.color = "#D32F2F";
    } else {
      apiKeyInput.type = "password";
      toggleBtn.textContent = "Show";
      settingsStatus.textContent = "";
      settingsStatus.style.color = "green";
    }
  }

  function saveEnterKeyPreference() {
    const enterKeyToggle = document.getElementById("enterKeyToggle");
    const settingsStatus = document.getElementById("settingsStatus");
    chrome.storage.sync.set({ enterKeyInterceptionEnabled: enterKeyToggle.checked }, function () {
      settingsStatus.textContent = "Preference saved!";
      setTimeout(() => settingsStatus.textContent = "", 3000);
    });
  }

  function toggleEllipsisMenu(event) {
    event.stopPropagation();
    const ellipsisMenu = document.getElementById("ellipsisMenu");
    const settingsView = document.getElementById("mem0-settings-view");
    if (settingsView && settingsView.style.display === "block") {
      ellipsisMenu.style.display = "none";
      return;
    }

    ellipsisMenu.style.display =
      ellipsisMenu.style.display === "block" ? "none" : "block";

    document.addEventListener("click", function closeMenu(e) {
      if (
        !ellipsisMenu.contains(e.target) &&
        e.target !== document.getElementById("ellipsisMenuBtn") &&
        (!settingsView || settingsView.style.display === "none")
      ) {
        ellipsisMenu.style.display = "none";
        document.removeEventListener("click", closeMenu);
      }
    });
  }

  function logout() {
    chrome.storage.sync.get(["apiKey", "access_token"], function (data) {
      const headers = getHeaders(data.apiKey, data.access_token);
      fetch("https://api.mem0.ai/v1/extension/", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          event_type: "extension_logout"
        })
      }).catch(error => {
        console.error("Error sending logout event:", error);
      });
    });
    chrome.storage.sync.remove(
      ["apiKey", "userId", "access_token"],
      function () {
        const sidebar = document.getElementById("mem0-sidebar");
        if (sidebar) {
          sidebar.style.right = "-450px";
        }
      }
    );
  }

  function openDashboard() {
    chrome.storage.sync.get(["userId"], function (data) {
      const userId = data.userId || "chrome-extension-user";
      chrome.runtime.sendMessage({
        action: "openDashboard",
        url: `https://app.mem0.ai/dashboard/user/${userId}`,
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMem0Sidebar);
  } else {
    initializeMem0Sidebar();
  }
})();
