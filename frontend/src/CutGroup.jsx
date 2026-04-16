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
    {
        "id": "cut_1",
        "name": "CUT 98",
        "tag": "Default"
    },
    {
        "id": "cut_2",
        "name": "CUT 96",
        "tag": "Default"
    },
    {
        "id": "cut_3",
        "name": "Annual household income (Q72) x Deep-dive restaurant_VCopy",
        "tag": "Default"
    },
    {
        "id": "cut_4",
        "name": "Age (Q71) x Deep-dive restaurant_V1Copy",
        "tag": "Default"
    },
    {
        "id": "cut_5",
        "name": "Customer segmentation x Deep-dive restaurant_V1Copy",
        "tag": "Default"
    },
    {
        "id": "cut_6",
        "name": "CUT 91",
        "tag": "Default"
    },
    {
        "id": "cut_7",
        "name": "CUT 90",
        "tag": "Default"
    },
    {
        "id": "cut_8",
        "name": "CUT 89",
        "tag": "Default"
    },
    {
        "id": "cut_9",
        "name": "Annual household income (Q72) x Deep-dive restaurant",
        "tag": "Default"
    },
    {
        "id": "cut_10",
        "name": "Age (Q71) x Deep-dive restaurant",
        "tag": "Default"
    },
    {
        "id": "cut_11",
        "name": "Customer segmentation x Deep-dive restaurant",
        "tag": "Default"
    },
    {
        "id": "cut_12",
        "name": "focus_restaurant x Customer segmentation",
        "tag": "Default"
    },
    {
        "id": "cut_13",
        "name": "Q1_ What is your age",
        "tag": "Default"
    },
    {
        "id": "cut_14",
        "name": "Q2_ With which gender do you identify",
        "tag": "Default"
    },
    {
        "id": "cut_15",
        "name": "Q3_ In which country do you currently reside",
        "tag": "Default"
    },
    {
        "id": "cut_16",
        "name": "Q4_ What is your postal code | Canada",
        "tag": "Default"
    },
    {
        "id": "cut_17",
        "name": "Q5_ What is your postal code | UK (Outward or first half only)",
        "tag": "Default"
    },
    {
        "id": "cut_18",
        "name": "Q6_ What is your postal code | Ireland",
        "tag": "Default"
    },
    {
        "id": "cut_19",
        "name": "Q7_ What is your postal code | Spain",
        "tag": "Default"
    },
    {
        "id": "cut_20",
        "name": "Q8_ What is your postal code | France",
        "tag": "Default"
    },
    {
        "id": "cut_21",
        "name": "Q9_ What is your postal code | Australia",
        "tag": "Default"
    },
    {
        "id": "cut_22",
        "name": "Q10_ What is your postal code | New Zealand",
        "tag": "Default"
    },
    {
        "id": "cut_23",
        "name": "Q11_ What is your postal code | Italy",
        "tag": "Default"
    },
    {
        "id": "cut_24",
        "name": "Q12_ What is your postal code | Germany",
        "tag": "Default"
    },
    {
        "id": "cut_25",
        "name": "Q13_ What is your postal code | Poland",
        "tag": "Default"
    },
    {
        "id": "cut_26",
        "name": "Q14_ Which of the following things have you done in the last month_ Please select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_27",
        "name": "Q15_ Which of the following restaurants _ shops have you heard of_ Please select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_28",
        "name": "Q16_ How recently have you dined at each of the following restaurants_ Please include dine-in_ delivery_ take-out_ and drive-thru",
        "tag": "Default"
    },
    {
        "id": "cut_29",
        "name": "Q17_ What meal or occasion did you have at _restaurant_ during your last dining occasion",
        "tag": "Default"
    },
    {
        "id": "cut_30",
        "name": "Q18_ Did you purchase food and_or drink on this most recent visit for _occasion_ with _restaurant_",
        "tag": "Default"
    },
    {
        "id": "cut_31",
        "name": "Q19_ What did you order _ purchased from your most recent visit for _occasion_ with _restaurant_",
        "tag": "Default"
    },
    {
        "id": "cut_32",
        "name": "Q20_ Thinking about this most recent visit for _occasion_ with _restaurant__ which of the following best describes your primary motivation for this visit",
        "tag": "Default"
    },
    {
        "id": "cut_33",
        "name": "Q21_ For your last visit to _restaurant__ how did you order",
        "tag": "Default"
    },
    {
        "id": "cut_34",
        "name": "Q22_ What did you buy at _restaurant_ during your last visit for _occasion__ Select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_35",
        "name": "Q23_ Can you list all the specific items you bought at _restaurant_ during your last visit for _occasion__ For example_ if you selected Beef burger entrée in the prior question_ we would like to know",
        "tag": "Default"
    },
    {
        "id": "cut_36",
        "name": "Q24_ How did you consume the food you ordered from _restaurant_ at your last visit for _occasion_",
        "tag": "Default"
    },
    {
        "id": "cut_37",
        "name": "Q25_ Based on your experience in your most recent _occasion_ visit_ how likely are you to recommend _restaurant_ to a friend or family member",
        "tag": "Default"
    },
    {
        "id": "cut_38",
        "name": "Q26_ Why did you provide that ratings for _restaurant_ for your last visit for _occasion_",
        "tag": "Default"
    },
    {
        "id": "cut_39",
        "name": "Q27_ For _occasion_ occasions_ which five of the following statements are most important to you when choosing a restaurant_ Please rank your top five",
        "tag": "Default"
    },
    {
        "id": "cut_40",
        "name": "Q28_ For your most recent _occasion_ visit at _restaurant__ do the following statements describe _restaurant_",
        "tag": "Default"
    },
    {
        "id": "cut_41",
        "name": "Q29_ During this last visit for _occasion_ at _restaurant__ who consumed the food _ drink_ Thinking specifically about the food you ordered_ Select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_42",
        "name": "Q30_ Think about your most recent _occasion_ visit to _restaurant__ what best describes your mindset or need at that time_ Please select up to 3 options",
        "tag": "Default"
    },
    {
        "id": "cut_43",
        "name": "Q31_ Before deciding on _restaurant_ for your last visit_ which other options did you also consider for _occasion__ Select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_44",
        "name": "Q32_ Thinking about your most recent visit with _restaurant_ for _occasion__ what most influenced your decision to choose _restaurant_ over other options",
        "tag": "Default"
    },
    {
        "id": "cut_45",
        "name": "Q33_ You mentioned you chose _restaurant_ over _considered_restaurant_ during your last visit_ can you elaborate why you specifically chose _restaurant_ for this _occasion_ occasion",
        "tag": "Default"
    },
    {
        "id": "cut_46",
        "name": "Q34_ For each of the following categories_ please select which restaurant has the best offering",
        "tag": "Default"
    },
    {
        "id": "cut_47",
        "name": "Q35_ What three adjective words would you use to describe _focus_restaurant_",
        "tag": "Default"
    },
    {
        "id": "cut_48",
        "name": "Q36_ How much do you agree that _focus_restaurant___",
        "tag": "Default"
    },
    {
        "id": "cut_49",
        "name": "Q37_ What is your favorite item at _focus_restaurant_",
        "tag": "Default"
    },
    {
        "id": "cut_50",
        "name": "Q38_ Are there any new items at _focus_restaurant_ that you have been excited about or want to try",
        "tag": "Default"
    },
    {
        "id": "cut_51",
        "name": "Q39_ How often do you visit _focus_restaurant_",
        "tag": "Default"
    },
    {
        "id": "cut_52",
        "name": "Q40_ What occasions do you dine at for _focus_restaurant__ Select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_53",
        "name": "Q41_ In the last month_ how many total visits did you make to _focus_restaurant_",
        "tag": "Default"
    },
    {
        "id": "cut_54",
        "name": "Q42_ Of the _X_ visits to _focus_restaurant_ you made in the last month_ please allocate them across the following occasions_ Allocation must add up to 100",
        "tag": "Default"
    },
    {
        "id": "cut_55",
        "name": "Q43_ How has your frequency of visiting or ordering from _focus_restaurant_ changed compared to a year ago",
        "tag": "Default"
    },
    {
        "id": "cut_56",
        "name": "Q44_ You indicated that you go to _focus_restaurant_ more often than before_ Why is that_ Select up to 3 options",
        "tag": "Default"
    },
    {
        "id": "cut_57",
        "name": "Q45_ You indicated that you go to _focus_restaurant_ less often than before_ Why is that_ Select up to 3 options",
        "tag": "Default"
    },
    {
        "id": "cut_58",
        "name": "Q46_ How likely are you to visit _focus_restaurant_ again in the next 3 months",
        "tag": "Default"
    },
    {
        "id": "cut_59",
        "name": "Q47_ Why",
        "tag": "Default"
    },
    {
        "id": "cut_60",
        "name": "Q48_ Over the next 3 months_ how do you expect your frequency of visiting or ordering from _focus_restaurant_ to change",
        "tag": "Default"
    },
    {
        "id": "cut_61",
        "name": "Q49_ Are you a member of _loyalty_program__ the _focus_restaurant_ loyalty program",
        "tag": "Default"
    },
    {
        "id": "cut_62",
        "name": "Q50_ How often do you use or engage with _loyalty_program__ the _focus_restaurant_ loyalty program",
        "tag": "Default"
    },
    {
        "id": "cut_63",
        "name": "Q51_ How satisfied are you with the following aspects of _loyalty_program__ the _focus_restaurant_ loyalty program",
        "tag": "Default"
    },
    {
        "id": "cut_64",
        "name": "Q52_ Since joining _loyalty_program__ the _focus_restaurant_ loyalty program_ has the percentage of your fast food spending at _focus_restaurant_ changed",
        "tag": "Default"
    },
    {
        "id": "cut_65",
        "name": "Q53_ What would motivate you to enroll in _loyalty_program__ the _focus_restaurant__s loyalty program_ Please select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_66",
        "name": "Q54_ Have you ever used the _focus_restaurant_ app",
        "tag": "Default"
    },
    {
        "id": "cut_67",
        "name": "Q55_ In general_ how satisfied are you with the _focus_restaurant_ app experience",
        "tag": "Default"
    },
    {
        "id": "cut_68",
        "name": "Q56_ How satisfied are you with the following aspects of the _focus_restaurant_ mobile app",
        "tag": "Default"
    },
    {
        "id": "cut_69",
        "name": "Q57_ Which of the following do you use the _focus_restaurant_ app for_ Please select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_70",
        "name": "Q58_ What are the main reasons you haven_t used the _focus_restaurant_ app_ Please select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_71",
        "name": "Q59_ Which of the following restaurants has the best app experience in your perspective",
        "tag": "Default"
    },
    {
        "id": "cut_72",
        "name": "Q60_ Why",
        "tag": "Default"
    },
    {
        "id": "cut_73",
        "name": "Q61_ Through which of the following channels have you seen or heard marketing from _focus_restaurant_ in the last month_ Please select all that apply",
        "tag": "Default"
    },
    {
        "id": "cut_74",
        "name": "Q62_ How important is it to you that a restaurant serves meat with the following characteristics",
        "tag": "Default"
    },
    {
        "id": "cut_75",
        "name": "Q63_ Now we would like your opinion about the following statements on a few different topics like food _ mealtime_ value_ brand and lifestyle_ Please indicate how much you agree or disagree with each",
        "tag": "Default"
    },
    {
        "id": "cut_76",
        "name": "Q64_ Now we would like your opinion about the following statements on a few different topics like food _ mealtime_ value_ brand and lifestyle_ Please indicate how much you agree or disagree with each",
        "tag": "Default"
    },
    {
        "id": "cut_77",
        "name": "Q65_ Now we would like your opinion about the following statements on a few different topics like food _ mealtime_ value_ brand and lifestyle_ Please indicate how much you agree or disagree with each",
        "tag": "Default"
    },
    {
        "id": "cut_78",
        "name": "Q66_ Now we would like your opinion about the following statements on a few different topics like food _ mealtime_ value_ brand and lifestyle_ Please indicate how much you agree or disagree with each",
        "tag": "Default"
    },
    {
        "id": "cut_79",
        "name": "Q67_ Now we would like your opinion about the following statements on a few different topics like food _ mealtime_ value_ brand and lifestyle_ Please indicate how much you agree or disagree with each",
        "tag": "Default"
    },
    {
        "id": "cut_80",
        "name": "Q68_ Now we would like your opinion about the following statements on a few different topics like food _ mealtime_ value_ brand and lifestyle_ Please indicate how much you agree or disagree with each",
        "tag": "Default"
    },
    {
        "id": "cut_81",
        "name": "Q69_ Now we would like your opinion about the following statements on a few different topics like food _ mealtime_ value_ brand and lifestyle_ Please indicate how much you agree or disagree with each",
        "tag": "Default"
    },
    {
        "id": "cut_82",
        "name": "Q70_ Now we would like your opinion about the following statements on a few different topics like food _ mealtime_ value_ brand and lifestyle_ Please indicate how much you agree or disagree with each",
        "tag": "Default"
    },
    {
        "id": "cut_83",
        "name": "Q71_ How old are you",
        "tag": "Default"
    },
    {
        "id": "cut_84",
        "name": "Q72_ What category does your total annual household income from all sources fall into",
        "tag": "Default"
    },
    {
        "id": "cut_85",
        "name": "Q73_ How many people live in your household_ including yourself",
        "tag": "Default"
    },
    {
        "id": "cut_86",
        "name": "Q74_ Which of the following best describes the area you live in",
        "tag": "Default"
    }
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