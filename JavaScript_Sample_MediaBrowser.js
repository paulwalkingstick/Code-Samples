/* $Rev: 4457 $ - $LastChangedDate: 2018-10-01 09:44:49 -0700 (Mon, 01 Oct 2018) $ */

function MediaBrowser(params) {
    var reqs = ['containerEle', 'resultsCallback', 'editorCallback', 'objectVar', 'view'];
    var fields = ['curriculum', 'curriculumLevel', 'curriculumId', 'curriculumall', 'curriculumcl', 'clmodules', 'module', 'curriculumLevelId', 'curriculumlevelall', 'moduleId', 'moduleall', 'clBreadcrumbs', 'resourceTypeId', 'textLevelId', 'keywords', 'sourceFilePath', 'limitPlays', 'totalRows', 'page', 'pageSize', 'order', 'dir', 'translation', 'allowMediaOptions'];
    var defaults = { 'order': 'title', 'dir': 'asc', 'page': 1, 'pageSize': 25, 'translation': true, 'allowMediaOptions': true };
    for (var i = 0; i < reqs.length; i++) {
        if (typeof (params[reqs[i]]) == 'undefined') return false;
    }
    for (var i in params) {
        this[i] = params[i];
    }
    for (var i = 0; i < fields.length; i++) {
        if (typeof (this[fields[i]]) == 'undefined')
            this[fields[i]] = (typeof (defaults[fields[i]]) != 'undefined') ? defaults[fields[i]] : null;
    }

    this.formObj = null;
    this.initialized = false;

    this.data = {};

    this.columns = {
        'resourceType': 'Type', 'preview': 'Preview', 'title': 'Title', 'originalFilename': 'File', 'format': 'Format'
    };

    this.actions = ['edit', 'details', 'paragraph', 'add'];

    this.render = null;
    this.previewID = null;

    this.canModify = false;
    this.canDelete = false;

    // object collections
    this.copyrightTypes = null;
    this.textLevels = null;
    this.languages = null;

    // element party for collections
    this.copyrightTypesElements = [];
    this.textLevelsElements = [];
    this.languagesElements = [];

    // html elements
    this.container = null;
    this.containerTabs = null;
    this.tabs = [];
    this.containerContent = null;
    this.containerUploadContent = null;
    this.containerDragFiles = null;
    this.containerUploadProgress = null;
    this.uploads = [];
    this.containerUploadCompleted = null;
    this.uploadCompletedItems = [];
    this.uploadFileInput = null;
    this.containerMediaContent = null;
    this.containerMediaFilters = null;
    this.keywordSearchInput = null;
    this.containerMediaResults = null;
    this.containerMediaOptions = null;
    this.containerPaging = null;
    this.containerLoading = null;
    this.resultItems = [];
    this.totalPages = 0;
    this.totalRows = null;
    this.acceptedFileExtensions = [
        'doc', 'docx', 'txt', 'rtf', 'ppt', 'pptx', 'pptm', 'xls', 'xlsx', 'pdf', 'jpg', 'jpeg', 'gif', 'png', 'mp3', 'mp4', '3gp', '3gpp'
    ];
    this.selectedMediaBrowserItem;

    this.get = function () {
        var clearResultsOnly = (this.get.arguments.length && typeof (this.get.arguments[0]) == 'boolean');

        if (clearResultsOnly)
            this.page = 1;

        var data = {
            'action': 'listbylevel', 'jsonpCallback': this.resultsCallback,
            'rowStart': ((this.page - 1) * this.pageSize + 1), 'rowEnd': (this.page * this.pageSize),
            'sort': this.order, 'dir': this.dir, 'refreshResults': clearResultsOnly
        };
        if (this.curriculumLevelId) {
            data.curriculumLevelId = this.curriculumLevelId;
            if (this.curriculumlevelall)
                data.curriculumlevelall = 1;
            else if (this.clmodules)
                data.clmodules = 1;
        }
        if (this.applicationId) {
            data.applicationId = this.applicationId;
        }
        if (this.curriculumId) {
            data.curriculumId = this.curriculumId;
            // return curriculum, curriculum level and module resources
            if (this.curriculumall)
                data.curriculumall = 1;
            else if (this.curriculumcl)
                data.curriculumcl = 1;
        }
        if (this.moduleId) {
            data.moduleId = this.moduleId;
            if (this.moduleall)
                data.moduleall = 1;
        }
        if (this.textLevelId)
            data.textLevelId = this.textLevelId;
        if (this.resourceTypeId && this.resourceTypeId.length)
            data.resourceTypeId = this.resourceTypeId.toString();
        if (this.keywords)
            data.keywords = this.keywords;
        if (this.sourceFilePath)
            data.sourceFilePath = this.sourceFilePath;

        if (this.moduleId) {
            this.loading(true);
            this.containerEle.appendChild(this.containerLoading);

            $.ajax(Globals.ajaxEndpoints.resource, {
                dataType: 'jsonp', type: 'post', data: data
            });
        }
        else {
            var errorMsg = "<div class=\"UCATErrorMsg\">";
            errorMsg += "<img src='catwalk/css/catwalkError.png' class='UCATErrorImgCenter' />";
            errorMsg += "<div class=\"UCATErrorAlertTitle\">What happened?</div>";
            errorMsg += "<div class=\"UCATErrorAlertTextfield\">This feature is temporarily suspended. It is expected to be back after the next UCAT software update in May.</div>";
            errorMsg += "</div>";
            document.getElementById(this.containerEle.id).innerHTML = errorMsg;
        }
    }

    this.render = function (data, response) {
        var clearResultsOnly = (Globals.isWebServiceCallback(this.render.arguments) && typeof (response.refreshResults) != 'undefined' && response.refreshResults == 'true');
        var opts;
        this.data = data.resources;

        this.loading(false);
        this.clearOptions();
        if (clearResultsOnly) {
            this.clearResults();
            this.loadData(data);
            this.renderResults();
            return;
        }
        else
            this.clear();

        this.canModify = (this.view == 'pm' || this.view == 'app' || (this.module && this.module.canModify));
        this.canDelete = (this.view == 'pm' || this.view == 'app' || (this.module && this.module.canDelete));

        // container
        this.container = uiController.createDiv({ classes: ['mediaManager'] });
        this.container.setAttribute('objectVar', this.objectVar);
        this.containerEle.appendChild(this.container);

        // tabs
        if (this.view != 'browser' && this.canModify) {
            this.containerTabs = uiController.createDiv({ id: 'mediaTabsContainer', classes: ['tabContainer'] });
            this.tabs.push(uiController.createDiv({ classes: ['tabSpacer'] }));
            if (this.canModify)
                this.tabs.push(uiController.createDiv({ id: 'uploadMediaTab', classes: ['tab selected'], text: 'Upload', containerEle: this.containerTabs, onclick: { obj: this, method: this.switchTabs } }));
            this.tabs.push(uiController.createDiv({ id: 'mediaMediaTab', classes: ['tab'], text: 'Media', containerEle: this.containerTabs, onclick: { obj: this, method: this.switchTabs } }));
            if (!this.canModify)
                this.tabs[this.tabs.length - 1].classList.add('selected');
            this.tabs.push(uiController.createDiv({ classes: ['tabSpacer'] }));
            this.container.appendChild(this.containerTabs);
        }

        // content
        this.containerContent = uiController.createDiv({ id: 'mediaManagerContainer' });
        this.container.appendChild(this.containerContent);

        if (this.view != 'browser' && this.canModify) {
            // upload
            this.containerUploadContent = uiController.createDiv({ id: 'mediaManagerUploadContent', classes: ['selected'] });
            this.containerContent.appendChild(this.containerUploadContent);
            // add button
            this.containerUploadContent.appendChild(uiController.createButton({ id: 'addFilesButton', color: 'green', text: 'Add Files', icon: 'plus', onclick: { obj: this, method: this.fileDialog } }));
            this.uploadFileInput = uiController.createElement('input', { id: 'addFilesInput', type: 'file', multiple: 'multiple', style: { display: 'none' }, accept: '.' + this.acceptedFileExtensions.join(",."), onchange: { obj: this, method: this.addUpload } });
            this.containerUploadContent.appendChild(this.uploadFileInput);
            // drag content
            this.containerDragFiles = uiController.createDiv({ id: 'dragFilesContainer', text: 'Drag Files Here', ondragover: { obj: this, method: this.toggleDragActive }, ondragout: { obj: this, method: this.toggleDragActive }, ondrop: { obj: this, method: this.dropUpload } });
            this.containerUploadContent.appendChild(this.containerDragFiles);
            // file progress container
            this.containerUploadProgress = uiController.createDiv({ id: 'fileProgressContainer', ondragover: { obj: this, method: this.toggleDragActive }, ondragout: { obj: this, method: this.toggleDragActive }, ondrop: { obj: this, method: this.dropUpload } });
            this.containerUploadContent.appendChild(this.containerUploadProgress);
        }

        // results container
        this.containerMediaContent = uiController.createDiv({ id: 'mediaManagerMediaContent', containerEle: this.containerContent });
        // browser defaults to visible
        if (!this.canModify || this.view == 'browser')
            this.containerMediaContent.classList.add('selected');

        // filters
        this.renderFilters();

        this.loadData(data);
        this.renderResults();
        initMediaPlayers(this.containerMediaResults, ((this.module) ? this.module.id : (this.curriculumLevel) ? this.curriculumLevel.id : (this.curriculum) ? this.curriculum.id : this.application.id));
    }
    this.renderFilters = function () {
        var opts = [];
        var containerEle = (this.renderFilters.arguments.length) ? this.renderFilters.arguments[0] : this.containerMediaContent;

        if (this.containerMediaFilters)
            uiController.clearElement(this.containerMediaFilters, true, true);

        this.containerMediaFilters = uiController.createDiv({ id: 'mediaManagerFiltersContainer', classes: ['expanded'], containerEle: containerEle });
        var filtersHeader = uiController.createDiv({ id: 'mediaManagerFiltersHeader', background: 'blue' });
        this.containerMediaFilters.appendChild(filtersHeader);
        filtersHeader.appendChild(uiController.createDiv({
            id: 'mediaManagerKeywordSearchContainer', elements: [
                uiController.createElement('input', { type: 'search', id: 'txtMediaManagerKeywordSearch', size: 30, placeholder: 'Search', onsearch: { obj: this, method: this.keywordSearch } }),
                uiController.createIcon('search', { tag: 'span', onclick: { obj: this, method: this.keywordSearch } })
            ]
        }));
        filtersHeader.appendChild(uiController.createSpan({ text: 'Filters', classes: ['mediaManagerFiltersTitle', 'mediaBrowsersFiltersMainTitle'] }));
        filtersHeader.appendChild(uiController.createToggler({ type: 'arrow-expanded', onclick: { obj: this, method: this.toggleFilters } }));
        // filters rows
        //Type Routine
        var row = uiController.createDiv({ classes: ['mediaManagerFiltersRow'] });
        row.appendChild(uiController.createSpan({ text: 'Type:', classes: ['mediaManagerFiltersTitle'] }));
        row.appendChild(uiController.createSelect({ id: 'mediaManagerFilterType', options: [{ value: '', text: 'All File Types' }, { value: 'audio', text: 'Audio' }, { value: 'image', text: 'Image' }, { value: 'video', text: 'Video' }], onchange: { obj: this, method: this.filterResourceType } }));
        this.containerMediaFilters.appendChild(row);
    }

    this.renderEdit = function (data, response) {

        document.querySelector('.cke_dialog_title').innerText = "Edit Media";
        this.loading(false);
        this.data = data.resources
        if (this.data.length > 0) {
            this.editMediaContainer = uiController.createDiv({ id: 'editMediaContainer', classes: ['editMediaContainer'] });
            this.containerEle.appendChild(this.editMediaContainer);

            this.editItemResultsContainer = uiController.createDiv({ classes: ['editItemResultsContainer'] });
            this.editMediaContainer.appendChild(this.editItemResultsContainer);
            this.editItemInstructionsContainer = uiController.createDiv({ classes: ['editItemResultsInstructions'] });
            var renderEditInstructions = "<p>1) To change the media item, click a new media item from the selection below.</p><p>2) To change the settings of an audio or video item (full player), do so in the same manners as you would for insert media.</p>";
            this.editItemInstructionsContainer.innerHTML = renderEditInstructions;
            this.editMediaContainer.appendChild(this.editItemInstructionsContainer);


            var cell = uiController.createDiv({ id: 'mediaBrowserItem_' + this.data[0].id, classes: ['mediaBrowserItem'], onclick: { obj: this, method: this.selectMediaBrowserItem, args: [this.data[0], 'mediaBrowserItem_' + this.data[0].id] } });
            var x = new MediaResult({ mediaBrowser: this, moduleResource: this.data[0], resource: this.data[0], type: this.data[0].resourceType.toLowerCase(), containerEle: cell, canModify: this.data[0].canModify, canDelete: this.data[0].canDelete, resultIndex: 0 });
            this.editItemResultsContainer.appendChild(x.render(cell));

            mbb.selectedMediaBrowserItem = this.data[0];
            cell.classList.add('selectedMediaBrowserElement');
            if (this.fullPlayer == 'true') {
                var cBox = document.getElementById("mediaBrowserSelectFullAudio_" + this.data[0].id);
                if (cBox != null && cBox != 'undefined') {
                    cBox.classList.toggle("fa-square-o");
                    cBox.classList.toggle("fa-check-square");
                    mbb.selectedMediaBrowserItem.fullAudioPlayer = (cBox.classList.contains("fa-check-square")) ? true : false;
                }
            }
        }
        this.resultsCallback = 'mbb.renderBrowser';
        this.sourceFilePath = null;
        this.get();
    }


    this.renderBrowser = function (data, response) {

        var clearResultsOnly = (Globals.isWebServiceCallback(this.renderBrowser.arguments) && typeof (response.refreshResults) != 'undefined' && response.refreshResults == 'true');
        var opts, d;
        if (!this.editMedia)
            document.querySelector('.cke_dialog_title').innerText = "Insert Media";

        this.data = data.resources;
        this.loading(false);

        if (clearResultsOnly) {
            this.clearResults();
            this.loadData(data);
            this.renderResults();
            return;
        }
        else {
            if (!this.container && (d = document.getElementById('mediaBrowser')))
                this.container = d;
            this.clear();
        }

        this.canModify = false;
        this.canDelete = false;

        // container
        this.container = uiController.createDiv({ id: 'mediaBrowser', classes: ['mediaBrowser'] });
        this.container.setAttribute('objectVar', this.objectVar);
        this.containerEle.appendChild(this.container);
        this.containerContent = uiController.createDiv({ id: 'mediaBrowserContainer' });
        this.container.appendChild(this.containerContent);

        this.containerMediaFilters = uiController.createDiv({ id: 'mediaBrowserFilters', classes: ['mediaBrowserFilters'], containerEle: this.containerContent });
        uiController.createSelect({ containerEle: this.containerMediaFilters, onchange: { obj: this, method: this.filterResourceType }, options: [{ value: '', text: 'All File Types' }, { value: 'audio', text: 'Audio' }, { value: 'image', text: 'Image' }, { value: 'video', text: 'Video' }, { value: 'document', text: 'Document' }] });

        // results
        this.containerMediaResults = uiController.createDiv({ containerEle: this.containerContent, id: 'mediaBrowserResults', classes: ['mediaBrowserResults'] });

        this.loadData(data);
        this.renderResults();
    }

    this.loadData = function (data) {
        if (this.totalRows == null)
            this.page = 1;
        this.totalRows = parseInt(data.totalRows);
        this.totalPages = Math.ceil(this.totalRows / this.pageSize);

        // translation?
        this.translation = ((this.module && (this.module.languages.length || (this.module.curriculum && this.module.curriculum.primaryLanguage))) || (this.curriculum && this.curriculum.primaryLanguage));
    }

    this.loading = function (on) {
        if (on && !this.containerLoading)
            this.containerLoading = uiController.createDiv({ id: 'mediaManagerLoadingDiv', element: uiController.createSpinner({}) });

        if (!on) {
            uiController.clearElement(this.containerLoading, true, true);
            this.containerLoading = null;
        }
        else
            this.containerLoading.style.display = 'block';
    }

    this.renderResults = function () {
        if (Globals.isWebServiceCallback(this.renderResults.arguments)) {
            var data = this.renderResults.arguments[0];
            this.data = data.resources;
            this.loadData(data);
            this.loading(false);
        }
        var d;

        if (this.view != 'browser') {
            if (d = document.getElementById('mediaManagerResultsContainer')) {
                uiController.clearElement(d, true, true);
            }

            this.containerMediaResults = uiController.createDiv({ id: 'mediaManagerResultsContainer', containerEle: this.containerMediaContent });
            for (var i = 0; i < this.data.length; i++) {
                row = uiController.createDiv({ id: 'mediaManagerResultItem_' + this.data[i].id, classes: ['mediaManagerResultItemContainer'], containerEle: this.containerMediaResults });
                row.dataId = this.data[i].id;
                this.resultItems.push(new MediaResult({ mediaBrowser: this, moduleResource: this.data[i], resource: this.data[i], type: this.data[i].resourceType.toLowerCase(), containerEle: row, canModify: this.data[i].canModify, canDelete: this.data[i].canDelete, resultIndex: i }));
                this.resultItems[this.resultItems.length - 1].render(row);
            }
        } else {
            if (d = document.getElementById('mediaBrowserResultsContainer')) {
                uiController.clearElement(d, true, true);
            }
            this.containerMediaResults = uiController.createDiv({ id: 'mediaBrowserResultsContainer', classes: ['mediaBrowserResultsContainer'], containerEle: this.container });
            var rowIncrement = 0;
            for (var i = 0; i < this.data.length; i++) {
                if ((i % 5) == 0) {
                    row = uiController.createDiv({ id: 'mediaBrowserResultRow' + rowIncrement, classes: ['mediaBrowserResultRow'], containerEle: this.containerMediaResults });
                    rowIncrement++;
                }
                if (this.editMediaPath != this.data[i].sourceFilePath) {
                    var cell = uiController.createDiv({ id: 'mediaBrowserItem_' + this.data[i].id, classes: ['mediaBrowserItem'], containerEle: row, onclick: { obj: this, method: this.selectMediaBrowserItem, args: [this.data[i], 'mediaBrowserItem_' + this.data[i].id] } });
                    this.resultItems.push(new MediaResult({ mediaBrowser: this, moduleResource: this.data[i], resource: this.data[i], type: this.data[i].resourceType.toLowerCase(), containerEle: cell, canModify: this.data[i].canModify, canDelete: this.data[i].canDelete, resultIndex: i }));
                    this.resultItems[this.resultItems.length - 1].render(cell);
                }
            }
        }

        this.renderPaging();
        this.renderMediaOptions()
    }

    this.renderMediaOptions = function () {
        if ((this.view == "browser") && this.allowMediaOptions) {
            this.clearOptions();
            if ((Globals.getResourceTypeNameById(mbb.selectedMediaBrowserItem.resourceTypeId).toLowerCase() == "audio") || (Globals.getResourceTypeNameById(mbb.selectedMediaBrowserItem.resourceTypeId).toLowerCase() == "video")) {
                this.containerMediaOptions = uiController.createDiv({ id: "mediaOptionsContainer" });
                this.containerMediaOptions.setAttribute('class', 'mediaOptionsContainer')

                var numPlaysArr = new Array();
                numPlaysArr.push({ id: "0", text: "unlimited" });
                for (var i = 1; i <= 10; i++) {
                    numPlaysArr.push({ value: i, text: i });
                }
                this.containerMediaOptions.appendChild(uiController.createSpan({ text: 'Number of Plays:' }));
                this.containerMediaOptions.appendChild(uiController.createSelect({ containerEle: this.containerMediaFilters, id: "mediaOptionsNumPlaysDDL", options: numPlaysArr, value: this.limitPlays, onchange: { method: this.selectNumberPlays } }));

                document.getElementById('mediaBrowserContainer').appendChild(this.containerMediaOptions);
            }
        }
    }

    this.renderPaging = function () {
        var paginationContainer, paginationSpan, buttons;

        if (!this.totalRows) {
            this.containerPaging = uiController.createDiv({ classes: ['mediaManagerPagingContainer'], containerEle: this.containerMediaResults, element: uiController.createDiv({ classes: ["dataTables_info"], html: 'No Results' }) });
            return;
        }

        this.containerPaging = uiController.createDiv({ classes: ['mediaManagerPagingContainer'], containerEle: this.containerMediaResults });
        //this.containerPaging.appendChild(uiController.createDiv({ classes: ["dataTables_info"], role: 'status', html: 'Showing ' + ((this.page - 1) * this.pageSize + 1) + ' to ' + ((this.page == this.totalPages) ? this.totalRows : (this.page * this.pageSize)) + ' of ' + this.totalRows + ' entries' }));

        paginationContainer = uiController.createDiv({ containerEle: this.containerPaging, classes: ["dataTables_paginate", "paging_full_numbers"] });
        paginationContainer.appendChild(uiController.createLink({ classes: ["paginate_button", "first"], data: { 'dt-idx': "0" }, text: 'First', onclick: { obj: this, method: this.pageChange } }));
        if (this.page == 1)
            paginationContainer.childNodes[0].classList.add('disabled');
        paginationContainer.appendChild(uiController.createLink({ classes: ["paginate_button", "previous"], data: { 'dt-idx': "1" }, text: 'Previous', onclick: { obj: this, method: this.pageChange } }));
        if (this.page == 1)
            paginationContainer.childNodes[1].classList.add('disabled');

        paginationSpan = uiController.createSpan({});
        paginationContainer.appendChild(paginationSpan);
        paginationContainer.appendChild(uiController.createLink({ classes: ["paginate_button", "next"], data: { 'dt-idx': "5" }, text: 'Next', onclick: { obj: this, method: this.pageChange } }));
        paginationContainer.appendChild(uiController.createLink({ classes: ["paginate_button", "last"], data: { 'dt-idx': "6" }, text: 'Last', onclick: { obj: this, method: this.pageChange } }));
        if (this.page == this.totalPages) {
            paginationContainer.childNodes[paginationContainer.childNodes.length - 2].classList.add('disabled');
            paginationContainer.childNodes[paginationContainer.childNodes.length - 1].classList.add('disabled');
        }

        var startPage = (this.page > 3) ? this.page - 3 : 1;
        var endPage = (this.totalPages > (this.page + 2)) ? this.page + 2 : this.totalPages;
        for (var i = startPage; i <= endPage; i++) {
            var lnk = uiController.createLink({ classes: ['paginate_button'], data: { 'dt-index': (i + 1) }, text: i, onclick: { obj: this, method: this.pageChange } });
            if (this.page == i)
                lnk.classList.add('active');
            paginationSpan.appendChild(lnk);
        }

        if (!this.totalRows) {
            buttons = this.containerPaging.getElementsByClassName('paginate_button');
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.add('disabled');
            }
        }

        this.containerPaging.appendChild(uiController.createDiv({ classes: ["dataTables_info"], role: 'status', html: 'Showing ' + ((this.page - 1) * this.pageSize + 1) + ' to ' + ((this.page == this.totalPages) ? this.totalRows : (this.page * this.pageSize)) + ' of ' + this.totalRows + ' entries' }));

        this.postRender();
    }

    this.renderFileInfo = function (mediaResult) {

    }

    this.renderUploadHeader = function () {
        this.containerUploadProgress.appendChild(uiController.createDiv({ id: 'mediaManagerUploadsHeader', background: 'green', text: 'Your Uploads' }));
    }

    this.getRowById = function (resourceId) {
        var d;
        if (d = document.getElementById('mediaManagerResult' + resourceId))
            return d;
        return null;
    }

    this.getResultById = function (resourceId) {
        for (var i = 0; i < this.resultItems.length; i++) {
            if (this.resultItems[i].resourceId == resourceId)
                return this.resultItems[i];
        }
        for (var i = 0; i < this.uploads.length; i++) {
            if (this.uploads[i].resourceId == resourceId)
                return this.uploads[i];
        }
        return false;
    }

    this.getUploadByIndex = function (uploadIndex) {
        return this.uploads[uploadIndex];
    }

    this.addRow = function (mediaResult) {
        this.resultItems.push(mediaResult);
        mediaResult.containerEle = this.containerMediaResults;
        mediaResult.render();
    }

    this.filterVisibility = function (evm, ele) {
        this.moduleall = null;
        this.curriculumId = null;
        this.curriculumall = null;
        this.curriculumcl = null;
        this.curriculumLevelId = null;
        this.curriculumlevelall = null;
        this.clmodules = null;

        switch (ele.options[ele.selectedIndex].value.toLowerCase()) {
            case 'moduleall':
                this.moduleall = 1;
                this.moduleId = this.module.id;
                break;
            case 'curriculumall':
                this.curriculumId = this.curriculum.id;
                this.curriculumall = 1;
                break;
            case 'curriculumcl':
                this.curriculumId = (this.curriculum) ? this.curriculum.id : (this.curriculumLevel ? this.curriculumLevel.curriculumId : 0);
                this.curriculumcl = 1;
                break;
            case 'curriculumlevelall':
                this.curriculumlevelall = 1;
                this.curriculumLevelId = this.curriculumLevel.id;
            case 'clmodules':
                this.clmodules = 1;
                this.curriculumLevelId = this.curriculumLevel.id;
            default:
                if (this.curriculum) {
                    this.curriculumId = this.curriculum.id;
                    if (!isNaN(parseInt(ele.options[ele.selectedIndex].value)))
                        this.curriculumLevelId = parseInt(ele.options[ele.selectedIndex].value);
                }
                else if (this.module)
                    this.moduleId = this.module.id;
                break;
        }
        this.get(true);
    }

    this.filterResourceType = function (evm, ele) {
        var val = ele.options[ele.selectedIndex].value;
        this.resourceTypeId = [];

        if (val)
            this.resourceTypeId.push(Globals.getResourceTypeIdByName(ele.options[ele.selectedIndex].value));

        this.get(true);
    }

    this.selectNumberPlays = function (ele) {
        var mediaOptionsNumPlaysDDL = document.getElementById("mediaOptionsNumPlaysDDL");
        document.limitPlays = mediaOptionsNumPlaysDDL.value;
    }

    this.keywordSearch = function (evm, ele, obj, eventType, ev) {
        this.page = 1;
        if (eventType.toLowerCase() == 'keyup' && ele.id == 'txtMediaManagerKeywordSearch' && ev.keyCode != 13)
            return;

        var txt = document.getElementById('txtMediaManagerKeywordSearch').value;
        if (txt.length < 3) {
            if (!this.keywords)
                return;
            else {
                this.keywords = null;
                this.resultsCallback = this.objectVar + '.renderResults';
                return this.get();
            }
        }

        this.keywords = txt;
        this.resultsCallback = this.objectVar + '.renderResults';
        this.totalRows = null;
        return this.get();
    }

    this.toggleFilters = function (evm, ele) {
        this.containerMediaFilters.classList.toggle('expanded');
        ele.classList.toggle('fa-caret-right');
        ele.classList.toggle('fa-caret-down');
    }

    this.postRender = function () {
        this.resultsCallback = this.objectVar + '.render';
        this.initialized = true;
    }
    this.selectMediaBrowserItem = function (mediaElement, targetContainerId) {
        //Clear fullAudioPlayer settings of previously selected element

        if (typeof mbb.selectedMediaBrowserItem !== 'undefined') {
            if (mbb.selectedMediaBrowserItem != mediaElement) {
                if ((Globals.getResourceTypeNameById(mbb.selectedMediaBrowserItem.resourceTypeId).toLowerCase() == 'audio')) {
                    var cBox = document.getElementById('mediaBrowserSelectFullAudio_' + mbb.selectedMediaBrowserItem.id);
                    if (cBox != null && cBox != 'undefined') {
                        if (cBox.classList.contains("fa-check-square")) {
                            cBox.classList.toggle("fa-check-square");
                            cBox.classList.toggle("fa-square-o");
                        }
                    }
                }
            }
        }
        mbb.selectedMediaBrowserItem = mediaElement;

        var selectedItem = document.getElementById('ucatMediaBrowser').querySelector('.selectedMediaBrowserElement')
        if (selectedItem) {
            selectedItem.classList.remove('selectedMediaBrowserElement')
        }
        if (document.getElementById(targetContainerId)) {
            document.getElementById(targetContainerId).classList.add('selectedMediaBrowserElement');
        }
        this.renderMediaOptions();
    }

    this.pageChange = function (evm, ele) {
        var d;

        if (ele.classList.contains('disabled'))
            return false;

        if (ele.classList.contains('first'))
            this.page = 1;
        else if (ele.classList.contains('previous'))
            this.page--;
        else if (ele.classList.contains('next'))
            this.page++;
        else if (ele.classList.contains('last'))
            this.page = this.totalPages;
        else if (!isNaN(parseInt(ele.innerHTML)))
            this.page = parseInt(ele.innerHTML);

        if (d = ele.parentNode.querySelector('.active'))
            d.classList.toggle('active');
        ele.classList.toggle('active');

        if (d = this.containerPaging.querySelector('.disabled'))
            d.classList.remove('disabled');
        if (this.page == 1) {
            this.containerPaging.querySelector('.previous').classList.add('disabled');
        }
        else if (this.page == this.totalPages) {
            this.containerPaging.querySelector('.next').classList.add('disabled');
        }

        this.resultsCallback = this.objectVar + '.renderResults';
        this.clearResults();
        this.loading(true);
        this.containerMediaResults.appendChild(this.containerLoading);
        this.get();
    }

    this.mediaTabHover = function (evm, ele) {
        if (ele.classList.contains('selected'))
            return;
        ele.classList.toggle('color_Green');
        ele.classList.toggle('themeBgrColor_2');
    }

    this.toggleMediaTab = function (evm, ele) {
        ele.classList.toggle('selected');
        if (!this.resourceTypeId)
            this.resourceTypeId = [];
        var idx = this.resourceTypeId.indexOf(ele.getAttribute('resourceTypeId'));
        if (idx > -1)
            this.resourceTypeId.splice(idx, 1);
        else
            this.resourceTypeId.push(ele.getAttribute('resourceTypeId'));

        this.resultsCallback = this.objectVar + '.renderResults';
        this.totalRows = null;
        this.get();
    }

    this.getFileType = function (mimeType) {
        switch (mimeType.toLowerCase()) {
            case 'text/plain':
                return 'text';
                break;
            case 'audio/mpeg':
            case 'audio/mp3':
                return 'audio';
                break;
            case 'video/mpeg':
            case 'video/mp4':
                return 'video';
                break;
            case 'image/gif':
            case 'image/jpeg':
            case 'image/png':
                return 'image';
                break;
            case 'application/msword':
            case 'application/vnd.ms-excel':
            case 'application/vnd.ms-powerpoint':
            case 'application/pdf':
                return 'document';
                break;
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            case 'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
                return 'online';
                break;
            default:
                return '';
        }
    }

    this.getFileTypeIcon = function (mediaResult) {
        var icon = 'fa-file-';

        if (mediaResult.type.toLowerCase() == 'document' || mediaResult.type.toLowerCase() == 'doc') {
            if (mediaResult.mimeType) {
                switch (mediaResult.mimeType.toLowerCase()) {
                    case 'application/pdf':
                        icon += 'pdf';
                        break;
                    case 'application/msword':
                        icon += 'word';
                        break;
                    case 'application/vnd.ms-excel':
                        icon += 'excel';
                        break;
                    case 'application/vnd.ms-powerpoint':
                        icon += 'powerpoint';
                        break;
                    default:
                        break;
                }
            }
            else {
                switch (mediaResult.name.toLowerCase().substr(mediaResult.name.lastIndexOf('.') + 1)) {
                    case 'pdf':
                        icon += 'pdf';
                        break;
                    case 'doc':
                    case 'docx':
                        icon += 'word';
                        break;
                    case 'xls':
                    case 'xlsx':
                        icon += 'excel';
                        break;
                    case 'ppt':
                    case 'pptm':
                    case 'pptx':
                        icon += 'powerpoint';
                        break;
                    default:
                        break;
                }
            }
        }
        else if (mediaResult.type)
            icon += mediaResult.type.toLowerCase();

        icon += '-o';

        return icon;
    }

    this.clearUpload = function () {
        this.uploadFileInput.value = '';
    }

    this.clearFileProgressItems = function () {
        this.containerUploadProgress.innerHTML = "";
    }

    this.updated = function () {
        alert('Data updated.');
    }

    this.clear = function () {
        if (this.container)
            uiController.clearElement(this.container, true, true);
    }

    this.clearResults = function () {
        if (!this.containerMediaResults)
            return true;
        if (!this.containerMediaResults.childNodes.length)
            return true;
        uiController.clearElement(this.containerMediaResults, false, false);
        this.clearOptions();

    }

    this.clearOptions = function () {
        if (!this.containerMediaOptions)
            return true;
        if (!this.containerMediaOptions.childNodes.length)
            return true;

        uiController.clearElement(this.containerMediaOptions, true, false);
    }

    this.switchTabs = function (evm, ele, obj, type, ev) {
        var tabs = this.containerTabs.getElementsByTagName('div');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('selected');
        }
        this.containerUploadContent.classList.remove('selected');
        this.containerMediaContent.classList.remove('selected');

        switch (ele.id.replace(/MediaTab/, '').toLowerCase()) {
            case 'upload':
                ele.classList.add('selected');
                this.containerUploadContent.classList.add('selected');
                break;
            case 'media':
                ele.classList.add('selected');
                this.containerMediaContent.classList.add('selected');
                this.clearFileProgressItems();
                this.get(true);
                break;
            default:
                break;
        }
    }

    this.fileDialog = function () {
        this.uploadFileInput.click();
    }

    this.toggleDragActive = function (evm, ele, type, evType, ev) {
        ev.preventDefault();
        ele.classList.toggle('active');
    }

    this.addUpload = function (evm, ele, obj, eType) {
        for (var i = 0; i < ele.files.length; i++) {
            var mu = new MediaUpload({ uploadIndex: obj.uploads.length, mediaBrowser: obj, file: ele.files[i] });
            if (!obj.uploads.length)
                this.renderUploadHeader();
            obj.uploads.push(mu);
            mu.upload(obj.uploads.length - 1);
        }
    }

    this.uploadToResult = function (resourceObj, uploadIndex) {
        var containerEle = this.uploads[uploadIndex].containerProgress;
        var mr = new MediaResult({ mediaBrowser: this, moduleResource: resourceObj, resource: resourceObj, type: resourceObj.resourceType.toLowerCase(), containerEle: containerEle, canModify: resourceObj.canModify, canDelete: false });
        uiController.clearElement(containerEle, false, true);
        containerEle.classList.remove('fileProgressItem');
        containerEle.classList.add('fileCompletedItem');
        containerEle.id = "mediaManagerResultItem_" + resourceObj.id;
        this.uploads[uploadIndex] = mr;
        mr.render(containerEle);
    }

    this.upload = function (i) {
        var _this = this;
        var xhr = new XMLHttpRequest();
        var fd = new FormData();
        xhr.open('POST', Globals.ajaxEndpoints.resource, true);
        fd.append('uploadFile', this.uploads[i].file);
        fd.append('action', 'uploadresource');
        fd.append('uploadIndex', i);
        if (this.module)
            fd.append('moduleId', this.module.id);
        else if (this.curriculum)
            fd.append('curriculumId', this.curriculum.id);

        fd.append('jsonpCallback', this.objectVar + '.upload');

    }

    this.dropUpload = function (evm, ele, type, evType, ev) {
        var mu;
        ev.preventDefault();
        ele.classList.remove('active');
        if (ev.dataTransfer.items) {
            for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                if (ev.dataTransfer.items[i].kind.toLowerCase() != 'file')
                    continue;
                mu = new MediaUpload({ uploadIndex: this.uploads.length, mediaBrowser: this, file: ev.dataTransfer.items[i].getAsFile() });
                if (mu) {
                    this.uploads.push(mu);
                    if (!mu.upload())
                        return;
                    mu.renderProgress(ev);
                }
            }
        }
        else if (ev.dataTransfer.files) {
            for (var i = 0; i < ev.dataTransfer.files.length; i++) {
                mu = new MediaUpload({ uploadIndex: this.uploads.length, mediaBrowser: this, file: ev.dataTransfer.files[i] });
                if (mu) {
                    this.uploads.push(mu);
                    if (!mu.upload())
                        return;
                    mu.renderProgress(ev);
                }
            }
        }
    }

    // returns html string
    this.buildPreview = function (data, _this) {
        var previewContainer = uiController.createDiv({ style: { textAlign: 'center' } });
        switch (data.resourceType.toLowerCase()) {
            case 'audio':
                var a = new UCATAudio({ sourceFilePath: data.sourceFilePath, playerId: 'resource' + data.id, preload: 'metadata' });
                uiController.mediaController.add('audio', a);
                previewContainer.appendChild(a.render());
                break;
            case 'video':
                previewContainer.innerHTML = previewContainer.innerHTML + '<video src="' + data.sourceFilePath + '" preload="none" controls></video>';
                break;
            case 'image':
                previewContainer.innerHTML = previewContainer.innerHTML + "<img src=\"images/ui/image.gif\" alt=\"Image\" title=\"View larger image\" onclick=\"uiController.openImage('" + data.sourceFilePath + "');\" />";
                break;
            case 'doc':
                previewContainer.innerHTML = previewContainer.innerHTML + "<img src=\"images/ui/docIcon.png\" alt=\"Document\" title=\"Open document\" onclick=\"uiController.openFile('" + data.sourceFilePath + "');\" />";
                break;
            default:
                previewContainer.innerHTML = previewContainer.innerHTML + "<img src=\"images/ui/file.gif\" alt=\"File\" title=\"Open file\" onclick=\"uiController.openFile('" + data.sourceFilePath + "');\" />";
                break;
        }
        return previewContainer;
    }

    this.getCopyrightTypes = function () {
        var ele, val;
        if (Globals.isWebServiceCallback(this.getCopyrightTypes.arguments)) {
            var response = this.getCopyrightTypes.arguments[0];
            var request = this.getCopyrightTypes.arguments[1];
            if ('error' in response)
                return uiController.programError('Error in getting copyright types: ' + response.error);

            ele = document.getElementById(request.elementId);
            val = request.elementValue;
            this.copyrightTypes = response.copyrightTypes;
        }
        else if (!this.copyrightTypes || (this.copyrightTypes && !this.copyrightTypes.length)) {
            ele = this.getCopyrightTypes.arguments[0];
            val = this.getCopyrightTypes.arguments[1];
            ele.innerHTML = '';

            // ajax hasn't run
            if (!this.copyrightTypes) {
                $.ajax(Globals.ajaxEndpoints.copyrightType, {
                    type: 'post', dataType: 'jsonp', data: {
                        action: 'list', elementId: ele.id, elementValue: val,
                        jsonpCallback: this.objectVar + '.getCopyrightTypes'
                    }
                });
                this.copyrightTypes = [];
            }
            // ajax is already running, so add this element to the party
            if (!this.copyrightTypes.length)
                this.copyrightTypesElements.push(ele);

            ele.options[0] = new Option('-- None --', '');
            return;
        }
            // ajax has already been run, so just load the data
        else if (this.getCopyrightTypes.arguments.length && this.getCopyrightTypes.arguments[0])
            this.copyrightTypesElements.push(this.getCopyrightTypes.arguments[0]);

        for (var e = 0; e < this.copyrightTypesElements.length; e++) {
            ele = this.copyrightTypesElements[e];
            if (ele.getAttribute('selectedValue'))
                val = ele.getAttribute('selectedValue');
            if (!ele.options.length)
                ele.options[0] = new Option('-- None --', '');
            for (var i = 0; i < this.copyrightTypes.length; i++) {
                ele.options[ele.options.length] = new Option(this.copyrightTypes[i].title, this.copyrightTypes[i].id);
                if (val && val == this.copyrightTypes[i].id)
                    ele.options[(ele.options.length - 1)].selected = true;
            }
        }
        this.copyrightTypesElements = [];
    }

    this.getTextLevels = function () {
        var ele, val;

        if (Globals.isWebServiceCallback(this.getTextLevels.arguments)) {
            var response = this.getTextLevels.arguments[0];
            var request = this.getTextLevels.arguments[1];
            if ('error' in response)
                return uiController.programError('Error in getting text levels: ' + response.error);

            ele = document.getElementById(request.elementId);
            val = request.elementValue;
            this.textLevels = response.textLevels;
        }
        else if (!this.textLevels || (this.textLevels && !this.textLevels.length)) {
            ele = this.getTextLevels.arguments[0];
            val = this.getTextLevels.arguments[1];
            ele.innerHTML = '';
            if (!this.textLevels) {
                $.ajax(Globals.ajaxEndpoints.textLevel, {
                    type: 'post', dataType: 'jsonp', data: {
                        action: 'list', elementId: ele.id, elementValue: val,
                        jsonpCallback: this.objectVar + '.getTextLevels'
                    }
                });
                this.textLevels = [];
            }
            if (!this.textLevels.length)
                this.textLevelsElements.push(ele);

            ele.options[0] = new Option('-- None --', '');
            return;
        }
            // ajax has already run, so just fill in the data
        else if (this.getTextLevels.arguments.length && this.getTextLevels.arguments[0])
            this.textLevelsElements.push(this.getTextLevels.arguments[0]);
        for (var e = 0; e < this.textLevelsElements.length; e++) {
            ele = this.textLevelsElements[e];
            if (ele.getAttribute('selectedValue'))
                val = ele.getAttribute('selectedValue');
            for (var i = 0; i < this.textLevels.length; i++) {
                ele.options[ele.options.length] = new Option(this.textLevels[i].title, this.textLevels[i].id);
                if (val == this.textLevels[i].id)
                    ele.options[(ele.options.length - 1)].selected = true;
            }
        }
        this.textLevelsElements = [];
    }

    this.getModuleLanguages = function (ele, val) {
        ele.innerHTML = '';
        ele.options[0] = new Option('English', 0);
        for (var i = 1; i < this.module.languages.length; i++) {
            if (this.module.languages[i].title.toLowerCase() == 'english')
                continue;
            ele.options[ele.options.length] = new Option(this.module.languages[i].title, this.module.languages[i].id);
            if (this.module.languages[i].id == val)
                ele.options[ele.options.length - 1].selected = true;
        }
    }

    this.getLanguages = function () {
        var ele, val;
        if (Globals.isWebServiceCallback(this.getLanguages.arguments)) {
            var response = this.getLanguages.arguments[0];
            var request = this.getLanguages.arguments[1];
            if ('error' in response)
                return uiController.programError('Error in getting languages: ' + response.error);

            ele = document.getElementById(request.elementId);
            val = request.elementValue;
            this.languages = response.languages;
        }
        else if (!this.languages || (this.languages && !this.languages.length)) {
            ele = this.getLanguages.arguments[0];
            val = this.getLanguages.arguments[1];
            ele.innerHTML = '';

            if (!this.languages) {
                $.ajax(Globals.ajaxEndpoints.language, {
                    type: 'post', dataType: 'jsonp', data: {
                        action: 'list', elementId: ele.id, elementValue: val,
                        jsonpCallback: this.objectVar + '.getLanguages'
                    }
                });
                this.languages = [];
            }
            if (!this.languages.length)
                this.languagesElements.push(ele);

            ele.options[0] = new Option('English', 0);
            return;
        }
        else if (this.getLanguages.arguments.length && this.getLanguages.arguments[0])
            this.languagesElements.push(this.getLanguages.arguments[0]);

        for (var e = 0; e < this.languagesElements.length; e++) {
            ele = this.languagesElements[e];
            if (ele.getAttribute('selectedValue'))
                val = ele.getAttribute('selectedValue');
            if (!ele.options.length)
                ele.options[0] = new Option('English', 0);
            for (var i = 0; i < this.languages.length; i++)
                ele.options[ele.options.length] = new Option(this.languages[i].title, this.languages[i].id);
        }
        this.languagesElements = [];
    }

    return this;
}

MediaBrowser.getActiveBrowser = function () {
    var d;
    var ds = document.getElementsByClassName('mediaManager');
    if (!ds.length)
        return null;
    if (ds.length > 1) {
        for (var i = 0; i < ds.length; i++) {
            var s = window.getComputedStyle(ds[i], null);
            if (s.display == 'none')
                continue;
            if (d)
                return uiController.programError('There are multiple active media browsers. The operation cannot continue.');
            else
                d = ds[i];
        }
    }
    else
        d = ds[0];
    if (!d.getAttribute('objectVar'))
        return null;
    return window[d.getAttribute('objectVar')];
}

MediaBrowser.killMedia = function (containerElementId) {
    var d = typeof document.getElementById(containerElementId) !== null ? document.getElementById(containerElementId) : false;
    if (d) {
        var players = d.querySelectorAll('audio, video');
        for (var i = 0, j = players.length; i < j; i++) {
            var type = players[i].tagName.toLowerCase();
            if (type == 'audio') {
                if (!players[i].paused) {
                    players[i].parentElement.click();
                }
            }
            if (type == 'video') {
                if (!players[i].paused) {
                    players[i].parentNode.outerHTML = '';
                }
            }
        }
    }
    else {
    }
}



