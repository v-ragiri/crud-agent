import React from "react";

function Tab({ name, cuts, tabId }) {
    const resolvedTabId = tabId || "tab_1";
    return (
        <div className="tab-column" data-tab-id={resolvedTabId} data-color="salmon">
            <div className="tab-header"><div className="tab-header-row">
                <input type="text" className="tab-name-input" defaultValue={name} maxLength="31" />
                <button className="delete-tab-btn">×</button></div>
                <div className="char-count">{name.length}/31</div></div>
            <div className="tab-content">
                <div className="tab-drop-zone" id={`dropzone_${resolvedTabId}`}>
                    {cuts.map((cut, i) => (
                        <div className="tab-cut-item" data-cut-id={cut.id} data-cut-name={cut.name} data-cut-tag={cut.tag || ''} key={i}>
                            <span className="drag-handle">⋮⋮</span>
                            <div className="cut-info">
                                <div className="cut-name" title={cut.name}>{cut.name}</div>
                                {cut.tag && <div className="cut-tag">{cut.tag}</div>}
                            </div>
                            <button className="remove-btn">×</button>
                        </div>
                    ))}
                </div>
            </div><div className="tab-footer">
                <span className="cut-count">{cuts.length}</span> cuts</div></div>
    );
}

export default Tab;