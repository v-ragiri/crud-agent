import React, { use, useEffect } from "react";
import "./cut-group.css";
import { autoCreateTabsFromTags } from "./utils/helpers.js";
import Tab from "./Tab.jsx";

function CutGroup() {
        const defaultTabs = [ {
        name: "Sheet 1",
        cuts: [
            { "id": "cut_1", "name": "Q4_ How many students are enrolled in the school y...", "tag": "SS" },
        ]
    }]
    const cuts = [
        { "id": "cut_1", "name": "Q4_ How many students are enrolled in the school y...", "tag": "SS" },
        { "id": "cut_2", "name": "Q6_ Which of the following school levels does your...", "tag": "BMS (1D)" },
        { "id": "cut_3", "name": "Q7_ How many students are enrolled in your school...", "tag": "Interval" },
        { "id": "cut_4", "name": "Q8_ Which of the following titles best describes yo...", "tag": "SS" },
        { "id": "cut_5", "name": "Q9_ Which of the following describes your responsib...", "tag": "BMS (1D)" },
        { "id": "cut_6", "name": "Q10_ You indicated that you are involved in selecting...", "tag": "SS" },
        { "id": "cut_7", "name": "Q11_ Which of the following are subject areas that y...", "tag": "BMS (1D)" },
        { "id": "cut_8", "name": "Q14_ You indicated that you are involved in curricul...", "tag": "BMS (1D)" },
        { "id": "cut_9", "name": "Q18_ How do you expect the number of grade levels...", "tag": "NBMS (2D)" },
        { "id": "cut_10", "name": "Q22_ On a scale of 0 to 10_ how likely are you to rec...", "tag": "NBMS (2D)" },
        { "id": "cut_11", "name": "Q29_ How well does _vendor_ perform on the follo...", "tag": "" },
        { "id": "cut_12", "name": "CUT 20", "tag": "NBMS x Custom count" },
    ];
    const tags = [];
    (() => {
        const uniqueTags = [...new Set(cuts.filter(cut => cut.tag).reduce((tags, cut) => {
            if (!tags.find(t => t.name === cut.tag)) {
                tags.push({ name: cut.tag, count: 1, cut_ids: [cut.id] });
            } else {
                const tag = tags.find(t => t.name === cut.tag);
                tag.count += 1;
                tag.cut_ids.push(cut.id);
            }
            return tags;
        }, []))];
        tags.push(...uniqueTags);
    })();

    return (
        <React.Fragment>
            <div className="container">
                <div className="modal">
                    <div className="header">
                        <h1>Configure cuts by tab for excel-cutter download</h1>
                        <div className="header-actions">
                            <button className="btn btn-secondary" id="cancelBtn">Cancel</button>
                            <button className="btn btn-secondary" id="resetBtn">Reset All</button>
                            <button className="btn btn-primary" id="downloadBtn">Proceed with Download</button>
                        </div>
                    </div>
                    <div className="cuts-container">
                        <div className="panel cuts-panel">
                            <div className="panel-header">
                                <h2>Cut Repository</h2>
                                <div className="subtitle">Click to select · Drag to add to tabs</div>
                            </div>
                            <div className="search-row">
                                <input type="text" id="searchInput" placeholder="Search cuts..." />
                            </div>
                            <div className="selection-hint" id="selectionHint">
                                <span><strong id="selectedCount">0</strong> selected — drag any to add all</span>
                                <button className="clear-selection" id="clearSelectionBtn">Clear</button>
                            </div>
                            <div className="left-panel-content">
                                <div className="cuts-section">
                                    <div className="section-header">
                                        <span>Cuts</span>
                                        <span className="count" id="cutsCount">0</span>
                                    </div>
                                    <div className="cuts-list" id="cutsList">
                                        {cuts.map((cut, i) => (
                                            <div className="cut-item" data-cut-id={cut.id} data-cut-name={cut.name} data-cut-tag={cut.tag || ''} key={i}>
                                                <div className="checkbox-area"><input type="checkbox" /></div>
                                                <div className="cut-info">
                                                    <div className="cut-name" title={cut.name}>{cut.name}</div>
                                                    {cut.tag && <div className="cut-tag">{cut.tag}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="tags-section" id="tagsSection">
                                    <div className="section-header" id="tagsHeader">
                                        <div className="section-header-left">
                                            <span className="collapse-icon">▼</span>
                                            <span>Tags</span>
                                            <span className="count" id="tagsCount">0</span>
                                        </div>
                                        <button className="btn btn-small btn-purple auto-create-btn" id="autoCreateBtn" onClick={(e) => autoCreateTabsFromTags(e, tags, cuts, defaultTabs, null)}>Auto-create tabs</button>
                                    </div>
                                    <div className="tags-content">
                                        <div className="tags-list" id="tagsList">
                                            {tags.map((tag, i) => (
                                                <div className="tag-item" data-tag-name={tag.name} data-cut-ids={cuts.filter(cut => cut.tag === tag.name).map(cut => cut.id).join(',')} key={i}>
                                                    <span className="drag-handle">⋮⋮</span>
                                                    <span className="tag-name">{tag.name}</span>
                                                    <span className="tag-count">{tag.count}</span>
                                                </div>
                                            ))}

                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="panel-footer">
                                <span id="totalCutsCount">0</span> cuts · <span id="totalTagsCount">0</span> tags
                            </div>
                        </div>
                        <div className="panel tabs-panel">
                            <div className="tabs-header">
                                <div>
                                    <h2>Excel Tabs</h2>
                                    <div className="tabs-subtitle">Drag header to reorder tabs</div>
                                </div>
                                <div className="stats">
                                    <span id="assignedCount">0</span> cuts · <span id="tabCount">1</span> tabs
                                </div>
                            </div>
                            <div className="tabs-scroll-container">
                                <div className="tabs-container tile-view" id="tabsContainer">
                                    {defaultTabs.length > 0 && defaultTabs.map((tab, i) => <Tab key={i} {...tab} tabId={tab.tabId || `tab_${i + 1}`} />)}
                                    <div className="add-tab-btn" id="addTabBtn">
                                        <div className="plus-icon">+</div>
                                        <div className="label">Add Tab</div>
                                    </div>
                                </div>
                            </div>
                            <div className="tabs-footer">
                                <div className="view-toggle">
                                    <span className="view-toggle-label">View:</span>
                                    <div className="view-toggle-btns">
                                        <button className="view-toggle-btn" id="columnViewBtn" title="Column View">☰ Columns</button>
                                        <button className="view-toggle-btn active" id="tileViewBtn" title="Tile View">▦ Tiles</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="toast" id="toast"></div>
        </React.Fragment>
    );
}

export default CutGroup;