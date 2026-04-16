/* Utility methods for cut selection and rendering */

/**
 * Gets the next color from the tabColors array in a cyclic manner.
 * @returns {string} The next color from the tabColors array. When the end of the array is reached, it cycles back to the beginning.
 */
const getNextColor = (currentIndex) => {
        const tabColors = [
                'salmon', 'sky', 'teal', 'peach',
                'violet', 'butter', 'rose', 'azure',
                'emerald', 'tangerine', 'orchid', 'honey'
            ];
    var color = tabColors[currentIndex % tabColors.length];
    return color;
}

/**
 * Checks whether a cut is currently in the selection.
 * @param {string} cutId - The ID of the cut to check.
 * @returns {boolean} True if the cut is selected, false otherwise.
 */
const isSelected = (cutId) => {
    return this.state.selectedIds.indexOf(cutId) !== -1;
}

/**
 * Adds a cut to the current selection if not already selected.
 * @param {string} cutId - The ID of the cut to add.
 */
const addToSelection = (cutId) => {
    if (!isSelected(cutId)) this.state.selectedIds.push(cutId);
}

/**
 * Removes a cut from the current selection.
 * @param {string} cutId - The ID of the cut to remove.
 */
const removeFromSelection = (cutId) => {
    var idx = this.state.selectedIds.indexOf(cutId);
    if (idx !== -1) this.state.selectedIds.splice(idx, 1);
}

/**
 * Clears the selection state by resetting the selected IDs array.
 */
const clearSelectionState = () => {
    this.state.selectedIds = [];
}

/**
 * Returns the number of currently selected cuts.
 * @returns {number} The count of selected cut IDs.
 */
const getSelectedCount = () => {
    return this.state.selectedIds.length;
}

/**
 * Returns the selected cuts in their original data order.
 * @returns {Array} Array of selected cut objects sorted by their position in cutsData.
 */
const getSelectedCutsSorted = () => {
    var result = [];
    for (var i = 0; i < this.state.cutsData.length; i++) {
        if (isSelected(this.state.cutsData[i].id)) result.push(this.state.cutsData[i]);
    }
    return result;
}

/**
 * Displays a temporary toast notification with the given message.
 * @param {string} msg - The message to display in the toast.
 */
const showToast = (msg) => {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); }, 2500);
}

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * @param {string} text - The raw text to escape.
 * @returns {string} HTML-safe escaped string.
 */
const escapeHtml = (text) => {
    var d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
}

/**
 * Renders an application-level alert message using the nova-alert component.
 * @param {string} msg - The alert body message.
 * @param {string} [type='success'] - The alert type (e.g. 'success', 'error', 'warning').
 */
const alert = (msg, type = 'success') => {
    document.querySelector("#application-alert-message").innerHTML = `<nova-alert heading="${type.charAt(0).toUpperCase() + type.slice(1)}" body="${msg}" type="${type}"></nova-alert>`
}

/**
 * Applies visual updates to reflect the current selection state of cut items.
 * Iterates through all cut items in the list, updating their checkbox states and visual styling
 * based on whether they are currently selected. Also updates the selection count display and
 * toggles visibility of the selection hint.
 * 
 * @function applySelectionVisuals
 * @returns {void}
 */
const applySelectionVisuals = (event) => {
    const items = document.querySelectorAll('#cutsList .cut-item');
    for (let i = 0; i < items.length; i++) {
        const item = items[i], cutId = item.getAttribute('data-cut-id'), checkbox = item.querySelector('input[type="checkbox"]'), selected = isSelected(cutId);
        if (checkbox) {
            checkbox.checked = selected;
        }
        if (selected) item.classList.add('selected'); else item.classList.remove('selected');
    }
    const count = getSelectedCount(), hint = document.getElementById('selectionHint');
    document.getElementById('selectedCount').textContent = count;
    if (count > 0) hint.classList.add('visible'); else hint.classList.remove('visible');
    event?.stopPropagation();
}

/**
 * Clears the selection state and refreshes the visual selection indicators.
 */
const clearSelection = () => {
    clearSelectionState();
    applySelectionVisuals();
}

/**
 * Toggles the selection state of a cut and updates the visual indicators.
 * @param {Event} event - The triggering mouse event (used to stop propagation).
 * @param {string} cutId - The ID of the cut to toggle.
 */
const toggleCutSelection = (event, cutId) => {
    if (isSelected(cutId))
        removeFromSelection(cutId);
    else addToSelection(cutId);
    applySelectionVisuals(event);
}

/**
 * Attaches mousedown/mousemove/mouseup/mouseleave handlers to the cuts list
 * to distinguish clicks from drags and trigger cut selection accordingly.
 */
const setupCutClickHandlers = () => {
    var mouseDownTime = 0;
    var mouseDownItem = null;
    var wasDragged = false;

    document.getElementById('cutsList')?.addEventListener('mousedown', (e) => {
        var cutItem = e.target.closest('.cut-item');
        if (cutItem) {
            mouseDownTime = Date.now();
            mouseDownItem = cutItem;
            wasDragged = false;
        }
    });

    document.getElementById('cutsList')?.addEventListener('mousemove', (e) => {
        if (mouseDownItem && (Date.now() - mouseDownTime) > 100) {
            wasDragged = true;
        }
    });

    document.getElementById('cutsList')?.addEventListener('mouseup', (e) => {
        var cutItem = e.target.closest('.cut-item');
        if (cutItem && cutItem === mouseDownItem && !wasDragged) {
            var elapsed = Date.now() - mouseDownTime;
            if (elapsed < 200) {
                this.toggleCutSelection(e, cutItem.getAttribute('data-cut-id'));
            }
        }
        mouseDownItem = null;
        wasDragged = false;
    });

    document.getElementById('cutsList')?.addEventListener('mouseleave', (e) => {
        mouseDownItem = null;
        wasDragged = false;
    });
}

/**
 * Renders the full list of tags into the tags list container.
 */
const renderTags = () => {
    var container = document.getElementById('tagsList'); container.innerHTML = '';
    for (var i = 0; i < this.state.tagsData.length; i++) {
        var tag = this.state.tagsData[i], div = document.createElement('div');
        div.className = 'tag-item';
        div.setAttribute('data-tag-name', tag.name);
        div.setAttribute('data-cut-ids', tag.cut_ids.join(','));
        div.innerHTML = '<span class="drag-handle">⋮⋮</span><span class="tag-name">' + escapeHtml(tag.name) + '</span><span class="tag-count">' + tag.count + '</span>';
        container.appendChild(div);
    }
    document.getElementById('tagsCount').textContent = this.state.tagsData.length;
    document.getElementById('totalTagsCount').textContent = this.state.tagsData.length;
}

/**
 * Attaches a click handler to the tags section header to toggle its collapsed state.
 */
const setupTagsCollapse = () => {
    document.getElementById('tagsHeader')?.addEventListener('click', function (e) {
        if (e.target.closest('.auto-create-btn')) return;
        document.getElementById('tagsSection')?.classList.toggle('collapsed');
    }.bind(this));
}

/**
 * Collects all current tab name input values into a lowercase lookup map.
 * @returns {Object} Map of lowercase tab names to true.
 */
const getExistingTabNames = (tabs) => {
    var names = {};
    for (var i = 0; i < tabs.length; i++) {
        var n = tabs[i].name.trim().toLowerCase();
        if (n) names[n] = true;
    }
    return names;
}

/**
 * Generates a tab name that is unique among existing names, appending a version
 * suffix (_v2, _v3, …) if the base name is already taken.
 * @param {string} baseName - The desired tab name.
 * @param {Object} existingNames - Lowercase name map (mutated to include the new name).
 * @returns {string} A unique tab name within the character limit.
 */
const generateUniqueTabName = (baseName, existingNames) => {
    var truncated = baseName.substring(0, 30);
    if (!existingNames[truncated.toLowerCase()]) {
        existingNames[truncated.toLowerCase()] = true;
        return truncated;
    }
    var base = baseName.substring(0, 30 - 3); // reserve space for _vX suffix
    for (var v = 2; v < 100; v++) {
        var name = base + '_v' + v;
        if (!existingNames[name.toLowerCase()]) {
            existingNames[name.toLowerCase()] = true;
            return name;
        }
    }
    return truncated;
}

/**
 * Truncates a tab name input value to the maximum allowed length and shows a
 * toast notification if truncation occurred.
 * @param {HTMLInputElement} input - The tab name input element to enforce.
 */
const enforceTabNameLength = (input) => {
    if (input.value.length > 30) {
        input.value = input.value.substring(0, 30);
        this.showToast(`Tab name truncated to 30 characters`);
    }
    updateCharCount(input);
    checkDuplicateTabNames();
}

/**
 * Updates the character count display next to a tab name input and applies a
 * warning style when the limit is reached.
 * @param {HTMLInputElement} input - The tab name input element whose count should update.
 */
const updateCharCount = (input) => {
    var tabHeader = input.closest('.tab-header'), cc = tabHeader.querySelector('.char-count');
    if (cc) {
        var len = input.value.length;
        cc.textContent = len + '/' + this.state.MAX_TAB_NAME_LENGTH;
        if (len >= this.state.MAX_TAB_NAME_LENGTH) cc.classList.add('warning');
        else cc.classList.remove('warning');
    }
}

/**
 * Scans all tab name inputs for duplicates and marks conflicting inputs with
 * the 'invalid' CSS class.
 */
const checkDuplicateTabNames = () => {
    var inputs = document.querySelectorAll('.tab-name-input'), names = {}, dups = {};
    for (var i = 0; i < inputs.length; i++) {
        var n = inputs[i].value.trim().toLowerCase();
        if (names[n]) dups[n] = true;
        else names[n] = true;
    }
    for (var j = 0; j < inputs.length; j++) {
        var nm = inputs[j].value.trim().toLowerCase();
        if (dups[nm]) inputs[j].classList.add('invalid');
        else inputs[j].classList.remove('invalid');
    }
}

/**
 * Creates and returns a DOM element representing a cut inside a tab drop zone.
 * @param {string} cutId - The cut's unique identifier.
 * @param {string} cutName - The display name of the cut.
 * @param {string} cutTag - The tag associated with the cut (may be empty).
 * @returns {HTMLDivElement} The assembled cut item element.
 */
const createTabCutElement = (cutId, cutName, cutTag) => {
    var div = document.createElement('div'); div.className = 'tab-cut-item';
    div.setAttribute('data-cut-id', cutId); div.setAttribute('data-cut-name', cutName); div.setAttribute('data-cut-tag', cutTag || '');
    div.innerHTML = '<span class="drag-handle">⋮⋮</span><div class="cut-info"><div class="cut-name" title="' + escapeHtml(cutName) + '">' + escapeHtml(cutName) + '</div>' + (cutTag ? '<div class="cut-tag">' + escapeHtml(cutTag) + '</div>' : '') + '</div><button class="remove-btn">×</button>';
    div.querySelector('.remove-btn').onclick = function (e) { e.stopPropagation(); var dz = div.parentNode; div.remove(); checkDropZoneEmpty(dz); updateStats(); };
    return div;
}

/**
 * Inserts an array of cuts into a drop zone before a given reference element,
 * or appends them if no reference is provided.
 * @param {HTMLElement} dropZone - The target drop zone element.
 * @param {Array} cuts - Array of cut objects to insert.
 * @param {HTMLElement|null} refEl - Reference element to insert before, or null to append.
 */
const insertCutsAtPosition = (dropZone, cuts, refEl) => {
    dropZone.classList.remove('empty-state');
    var ph = dropZone.querySelector('.placeholder-text');
    if (ph) ph.remove();
    if (refEl && refEl.parentNode === dropZone) {
        for (var i = 0; i < cuts.length; i++) dropZone.insertBefore(createTabCutElement(cuts[i].id, cuts[i].name, cuts[i].tag), refEl);
    } else {
        for (var i = 0; i < cuts.length; i++) dropZone.appendChild(createTabCutElement(cuts[i].id, cuts[i].name, cuts[i].tag));
    }
    updateStats();
}

/**
 * Appends an array of cuts to the drop zone of the specified tab.
 * @param {string} tabId - The ID of the target tab.
 * @param {Array} cuts - Array of cut objects to add.
 */
const addCutsToTab = (tabName, cuts, tabs, tabId) => {
    console.log(`[addCutsToTab] Adding ${cuts.length} cuts to tab "${tabName}" (id: ${tabId})`);    
    var dropzoneId = 'dropzone_' + tabId;
    var dz = document.getElementById(dropzoneId);
    if (!dz) {
        console.warn(`[addCutsToTab] Dropzone not found for tab "${tabName}" (id: ${dropzoneId})`);
        return;
    }
    var beforeCount = dz.querySelectorAll('.tab-cut-item').length;
    dz.classList.remove('empty-state'); 
    var ph = dz.querySelector('.placeholder-text'); 
    if (ph) ph.remove(); 
    for (var i = 0; i < cuts.length; i++) dz.appendChild(createTabCutElement(cuts[i].id, cuts[i].name, cuts[i].tag)); 
    var afterCount = dz.querySelectorAll('.tab-cut-item').length;
    updateStats(); 
}

/**
 * Checks whether a drop zone has no cut items and restores the empty-state
 * placeholder if so.
 * @param {HTMLElement} dz - The drop zone element to check.
 */
const checkDropZoneEmpty = (dz) => {
    if (dz.querySelectorAll('.tab-cut-item').length === 0) {
        dz.classList.add('empty-state');
        dz.innerHTML = '<span class="placeholder-text">Drop cuts here</span>';
    }
}

const readCutsandTagsFromDOM = (cuts, tags) => {
    const cutItems = document.querySelectorAll(".cut-item");
    if (!cutItems.length) {
      return { success: false, error: "No cuts/tags item found in the DOM" };
    }
    cutItems.forEach(item => {
      const cutId = item.getAttribute("data-cut-id");
      const tagName = item.getAttribute("data-cut-tag");
      const cutName = item.getAttribute("data-cut-name");
      cuts.push({ id: cutId, name: cutName, tag: tagName || null });
      if (tagName) {
        if (!tags.find(t => t.name === tagName)) {
          tags.push({ name: tagName, cut_ids: [cutId] });
        } else {
          const existingTag = tags.find(t => t.name === tagName);
          existingTag.cut_ids.push(cutId);
        }
      }
    });
}


/**
 * Creates a new tab column with a unique name, colour, and an empty drop zone,
 * and wires up all related event handlers and sortable behaviour.
 * @param {string|null} tabName - Desired tab name, or null to auto-generate one.
 * @param {Object} [existingNames] - Optional existing names map to avoid duplicates.
 * @returns {string} The generated tab ID.
 */
const createTab = (tabName, existingNames, tabs, index) => {
    let tabCounter = document.querySelectorAll('.tab-column').length + 1;
    var tabId = 'tab_' + tabCounter;
    while (document.getElementById('dropzone_' + tabId) || document.querySelector('.tab-column[data-tab-id="' + tabId + '"]')) {
        tabCounter++;
        tabId = 'tab_' + tabCounter;
    }
    var finalName = tabName ? generateUniqueTabName(tabName, existingNames || getExistingTabNames(tabs)) : generateUniqueTabName('Sheet ' + tabCounter, getExistingTabNames(tabs));
    var color = getNextColor(index);
    var col = document.createElement('div'); col.className = 'tab-column'; col.setAttribute('data-tab-id', tabId); col.setAttribute('data-color', color);
    col.innerHTML = '<div class="tab-header"><div class="tab-header-row"><input type="text" class="tab-name-input" value="' + escapeHtml(finalName) + '" maxlength="' + 30 + '"><button class="delete-tab-btn">×</button></div><div class="char-count">' + (finalName ? finalName.length : 0) + '/' + 30 + '</div></div><div class="tab-content"><div class="tab-drop-zone empty-state" id="dropzone_' + tabId + '"><span class="placeholder-text">Drop cuts here</span></div></div><div class="tab-footer"><span class="cut-count">0</span> cuts</div>';
    document.getElementById('addTabBtn').before(col);
    col.querySelector('.delete-tab-btn').onclick = function (e) { e && e.stopPropagation(); deleteTab(tabId); };
    var inp = col.querySelector('.tab-name-input');
    inp.oninput = function () { enforceTabNameLength(this); };
    inp.onblur = checkDuplicateTabNames;
    inp.onmousedown = function (e) { e && e.stopPropagation(); };
    return tabId;
}

/**
 * Removes a tab column and its associated sortable instance. Prevents deletion
 * when only one tab remains.
 * @param {string} tabId - The ID of the tab to delete.
 */
const deleteTab = (tabId) => {
    if (document.querySelectorAll('.tab-column').length <= 1) {
        alert('Need at least one tab.', 'error');
        return;
    }
    var tab = document.querySelector('.tab-column[data-tab-id="' + tabId + '"]');
    if (tab) tab.remove();
    // checkDuplicateTabNames();
    // initTabsDraggable();
    // updateStats();
}

/**
 * Recalculates and updates the per-tab cut counts, total assigned count, and
 * total tab count displayed in the UI.
 */
const updateStats = () => {
    var tabs = document.querySelectorAll('.tab-column'), total = 0;
    for (var i = 0; i < tabs.length; i++) {
        var cnt = tabs[i].querySelectorAll('.tab-cut-item').length;
        total += cnt;
        var ft = tabs[i].querySelector('.cut-count');
        if (ft) ft.textContent = cnt;
    }
    document.getElementById('assignedCount').textContent = total;
    document.getElementById('tabCount').textContent = tabs.length;
}

/**
 * Filters the cuts list based on the current search input value, hiding
 * non-matching items and updating the visible count display.
 */
const filterCuts = () => {
    var term = document.getElementById('searchInput')?.value.toLowerCase(), items = document.querySelectorAll('#cutsList .cut-item'), vis = 0;
    for (var i = 0; i < items.length; i++) {
        var nm = (items[i].getAttribute('data-cut-name') || '').toLowerCase(), tg = (items[i].getAttribute('data-cut-tag') || '').toLowerCase(), match = nm.indexOf(term) !== -1 || tg.indexOf(term) !== -1;
        items[i].style.display = match ? 'flex' : 'none';
        if (match) vis++;
    }
    document.getElementById('cutsCount').textContent = vis;
}

/**
 * Switches the tabs container between column and tile layout views and updates
 * the active state of the view toggle buttons.
 * @param {string} view - The view to activate: 'column' or 'tile'.
 */
const setView = (view) => {
    this.state.currentView = view;
    var container = document.getElementById('tabsContainer');
    var columnBtn = document.getElementById('columnViewBtn');
    var tileBtn = document.getElementById('tileViewBtn');
    if (view === 'column') {
        container.classList.remove('tile-view');
        container.classList.add('column-view');
        columnBtn.classList.add('active');
        tileBtn.classList.remove('active');
    } else {
        container.classList.remove('column-view');
        container.classList.add('tile-view');
        tileBtn.classList.add('active');
        columnBtn.classList.remove('active');
    }
    this.showToast(view === 'column' ? 'Column view' : 'Tile view');
}

/**
 * Attaches click handlers to the column and tile view toggle buttons.
 */
const setupViewToggle = () => {
    document.getElementById('columnViewBtn').onclick = function () { setView('column'); }.bind(this);
    document.getElementById('tileViewBtn').onclick = function () { setView('tile'); }.bind(this);
}

/**
 * Initialises (or reinitialises) the Sortable instance on the cuts list,
 * configuring clone-based drag behaviour and multi-selection badge display.
 */
const initCutsSortable = () => {
    if (this.state.cutsSortableInstance) this.state.cutsSortableInstance.destroy();
    this.state.cutsSortableInstance = new Sortable(document.getElementById('cutsList'), {
        group: { name: 'cuts', pull: 'clone', put: false }, sort: false, animation: 150, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', delay: 50, delayOnTouchOnly: true,
        onChoose: function (evt) {
            this.state.isDragging = true;
        }.bind(this),
        onStart: function (evt) {
            var cutId = evt.item.getAttribute('data-cut-id');
            if (!this.isSelected(cutId)) {
                this.clearSelectionState();
                this.addToSelection(cutId);
                this.applySelectionVisuals();
            }
        }.bind(this),
        onClone: function (evt) {
            if (this.state.currentView === 'tile') {
                evt.item.classList.add('drag-clone-compact');
            }
            var count = this.getSelectedCount();
            if (count > 1) {
                evt.item.style.position = 'relative';
                var badge = document.createElement('span');
                badge.className = 'drag-count-badge';
                badge.textContent = '+' + (count - 1);
                evt.item.appendChild(badge);
            }
        }.bind(this),
        onUnchoose: function (evt) {
            this.state.isDragging = false;
        }.bind(this),
        onEnd: function (evt) {
            this.state.isDragging = false;
            evt.item.classList.remove('drag-clone-compact');
            var badge = evt.item.querySelector('.drag-count-badge');
            if (badge) badge.remove();
            setTimeout(() => { this.clearSelectionState(); this.applySelectionVisuals(); }, 50);
        }.bind(this)
    });
}

/**
 * Initialises the Sortable instance on the tags list, enabling clone-based
 * dragging of tags into tab drop zones.
 */
const initTagsSortable = () => {
    new Sortable(document.getElementById('tagsList'), {
        group: { name: 'tags', pull: 'clone', put: false }, sort: false, animation: 150, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen',
        onClone: function (evt) {
            if (this.state.currentView === 'tile') {
                evt.item.classList.add('drag-clone-compact');
            }
        }.bind(this),
        onEnd: function (evt) {
            evt.item.classList.remove('drag-clone-compact');
        }.bind(this)
    });
}

/**
 * Initialises the Sortable instance for a specific tab's drop zone, handling
 * drops from the cuts list, tags list, and other tab zones.
 * @param {string} tabId - The ID of the tab whose drop zone should become sortable.
 */
const initTabSortable = (tabId) => {
    var dz = document.getElementById('dropzone_' + tabId); if (!dz) return;
    this.state.tabSortables[tabId] = new Sortable(dz, {
        group: { name: 'tabZone', put: ['cuts', 'tags', 'tabZone'] }, animation: 150, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen',
        onAdd: (evt) => {
            var item = evt.item, dropZone = evt.to, refEl = item.nextElementSibling;
            while (refEl && !refEl.classList.contains('tab-cut-item')) refEl = refEl.nextElementSibling;
            if (item.classList.contains('tag-item')) {
                var tagName = item.getAttribute('data-tag-name'), cutIds = (item.getAttribute('data-cut-ids') || '').split(',').filter(function (x) { return x; });
                item.remove();
                var cutsToAdd = [];
                for (var i = 0; i < this.state.cutsData.length; i++) {
                    if (cutIds.indexOf(this.state.cutsData[i].id) !== -1) cutsToAdd.push(this.state.cutsData[i]);
                }
                if (cutsToAdd.length > 0) {
                    this.insertCutsAtPosition(dropZone, cutsToAdd, refEl);
                    this.showToast('Added ' + cutsToAdd.length + ' cuts from "' + tagName + '"');
                }
            }
            else if (item.classList.contains('cut-item')) {
                item.remove();
                var cutsToAdd = this.getSelectedCutsSorted();
                if (cutsToAdd.length > 0) {
                    this.insertCutsAtPosition(dropZone, cutsToAdd, refEl);
                    this.showToast('Added ' + cutsToAdd.length + ' cut(s)');
                }
            }
            this.clearSelectionState();
            this.applySelectionVisuals();
        },
        onSort: () => { this.updateStats(); },
        onRemove: (evt) => {
            this.checkDropZoneEmpty(evt.from);
            this.updateStats();
        }
    });
}

/**
 * Initialises (or reinitialises) the Sortable instance on the tabs container
 * to allow reordering of tab columns via drag-and-drop on their headers.
 */
const initTabsDraggable = () => {
    if (this.state.tabsSortable) this.state.tabsSortable.destroy();
    this.state.tabsSortable = new Sortable(document.getElementById('tabsContainer'), {
        animation: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', handle: '.tab-header', filter: '.add-tab-btn, .tab-name-input, .delete-tab-btn', preventOnFilter: false, ghostClass: 'sortable-ghost', draggable: '.tab-column',
        onStart: (evt) => { evt.item.classList.add('tab-dragging'); },
        onEnd: (evt) => {
            evt.item.classList.remove('tab-dragging');
            evt.item.classList.add('tab-landing');
            setTimeout(() => { evt.item.classList.remove('tab-landing'); }, 250);
            var container = document.getElementById('tabsContainer');
            var addBtn = document.getElementById('addTabBtn');
            if (addBtn && addBtn.nextElementSibling) {
                container.appendChild(addBtn);
            }
            if (evt.oldIndex !== evt.newIndex) this.showToast('Tab moved');
        }
    });
}

/**
 * Automatically creates one tab per tag (populated with the tag's cuts) and an
 * additional 'Untagged' tab for cuts without a tag, then shows a summary toast.
 */
const autoCreateTabsFromTags = (e, tags, cutsData, existingTabs, newTabs) => {
    e && e.stopPropagation();
    var existingNames = getExistingTabNames(existingTabs), created = 0;
    for (var t = 0; t < newTabs.length; t++) {
        var tag = newTabs[t], tabId = createTab(tag.name, existingNames, existingTabs, t), cuts = newTabs.find(tb => tb.name === tag.name)?.cuts || [];
        addCutsToTab(tag.name, cuts, existingTabs, tabId);
        created++;
    }
}

/**
 * Prompts the user for confirmation, then destroys all tab sortables, removes
 * all tab columns, resets counters and selection state, and creates a fresh empty tab.
 */
const resetAll = () => {
    showConfirmDialog('Reset Configuration', 'Are you sure you want to reset? This will clear all tabs and selections.', 'Reset',).then((confirmed) => {
        for (var id in this.state.tabSortables) {
            if (this.state.tabSortables[id]) this.state.tabSortables[id].destroy();
        }
        this.state.tabSortables = {};
        var tabs = document.querySelectorAll('.tab-column');
        for (var i = 0; i < tabs.length; i++) tabs[i].remove();
        this.state.tabCounter = 0;
        this.state.colorIndex = 0;
        this.clearSelection();
        this.createTab(null);
    });
}

/**
 * Validates tabs (no empty tabs, no duplicate names), builds a JSON configuration
 * object from the current tab/cut arrangement, and triggers a file download.
 */
const proceedWithDownload = () => {
    var tabs = document.querySelectorAll('.tab-column'), emptyTabNames = [];
    for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].querySelectorAll('.tab-cut-item').length === 0) emptyTabNames.push(tabs[i].querySelector('.tab-name-input').value || 'Unnamed');
    }
    if (emptyTabNames.length > 0) { this.alert('Please add cuts to empty tab(s): ' + emptyTabNames.join(', '), 'error'); return; }
    var inputs = document.querySelectorAll('.tab-name-input'), names = {}, hasDups = false;
    for (var i = 0; i < inputs.length; i++) {
        var n = inputs[i].value.trim().toLowerCase();
        if (names[n]) { hasDups = true; break; }
        names[n] = true;
    }
    if (hasDups) { this.alert('Please fix duplicate tab names before downloading.', 'error'); return; }
    var config = { generated_at: new Date().toISOString(), tabs: [] };
    for (var j = 0; j < tabs.length; j++) {
        var cuts = [], items = tabs[j].querySelectorAll('.tab-cut-item');
        for (var k = 0; k < items.length; k++) cuts.push({ order: k + 1, cut_id: items[k].getAttribute('data-cut-id'), cut_name: items[k].getAttribute('data-cut-name'), tag: items[k].getAttribute('data-cut-tag') || '' });
        config.tabs.push({ tab_name: tabs[j].querySelector('.tab-name-input').value || 'Unnamed', cuts: cuts });
    }
    var total = 0;
    for (var l = 0; l < config.tabs.length; l++) total += config.tabs[l].cuts.length;
    var blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cut_configuration.json';
    document.appendChild(a);
    a.click();
    document.removeChild(a);
    this.alert('Downloaded ' + total + ' cuts', 'success');
}

export { getNextColor, isSelected, addToSelection, removeFromSelection, readCutsandTagsFromDOM, clearSelectionState, getSelectedCount, getSelectedCutsSorted, showToast, escapeHtml, alert, applySelectionVisuals, clearSelection, toggleCutSelection, setupCutClickHandlers, renderTags, setupTagsCollapse, getExistingTabNames, generateUniqueTabName, enforceTabNameLength, updateCharCount, checkDuplicateTabNames, createTab, deleteTab, updateStats, filterCuts, setView, setupViewToggle, initCutsSortable, initTagsSortable, initTabSortable, initTabsDraggable, autoCreateTabsFromTags, resetAll, proceedWithDownload };