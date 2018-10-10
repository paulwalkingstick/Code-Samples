/* $Rev: 4459 $ - $LastChangedDate: 2018-10-01 10:26:26 -0700 (Mon, 01 Oct 2018) $ */
/// <reference path="publisher.js" />
var selectedDate = "";
var schedulerFilters = { type: "", status: "", classroom: "", title:""};

var checkDate;
var resetToDate = "";

$(document).ready(function ()
{
    updateCurrentPosition("Assignments");
    $("#schedulerNavLink").attr("class", "toolBarLinkSelected");
    selectedDate = selectedSchedulerDate;
    //Page Title
    /* $("#schedulerContainerDiv").prepend("<div class=\"interfaceListTitleBlack interfaceVertMargin filterHeaderIcon interfaceWidthFull\">Scheduler</div>"); */
    //check device
    var ua = navigator.userAgent.toLowerCase();
    if (/android | iphone | blackberry | windows phone/i.test(ua))
    {
        $("#schedulerContainerDiv").children().switchClass("interfaceTwoColumn", "interfaceAlignTop interfaceWidthFull");
    }
    if (classrooms.length > 1)
    {
        var FilterClassroomDD = $("#FilterClassroomDD");
        FilterClassroomDD.append("<option value=\"\">All</option>");
        for (i = 0; i < classrooms.length; i++)
        {
            FilterClassroomDD.append("<option value=\"" + classrooms[i].id + "\">" + htmlDecode(classrooms[i].title) + " (" + classrooms[i].classNumber + ")</option>");
        }
    }
    getSessionState("schedulerFilters", true, function (value)
    {
        if (typeof (value) != "undefined")
        {
            schedulerFilters = value;
            schedulerFilters.title = schedulerFilters.title.trim();
            $("#FilterTypeDD").val(schedulerFilters.type);
            $("#FilterStatusDD").val(schedulerFilters.status);
            $("#FilterClassroomDD").val(schedulerFilters.classroom);
            $("#FilterTitleTB").val(schedulerFilters.title);
            if ((schedulerFilters.type != "") || (schedulerFilters.status != "") || (schedulerFilters.title != "") || (schedulerFilters.classroom != ""))
                $("#clearSchedulerFiltersBtn").show();
        }
        setupCalendar();
    });
    buildToolbar();
});

function listAssignments(datePassedFromCalendar)
{
    if (datePassedFromCalendar)
    {
        if (typeof (datePassedFromCalendar) == "object")
            selectedDate = datePassedFromCalendar.toJSON();
        else
            selectedDate = datePassedFromCalendar;
    }
    $.ajax(
    {
        type: "POST",
        dataType: "jsonp",
        url: domainRootPath + "WebServices/Assignment/Assignment.aspx",
        data:
        {
            "jsonpCallback": "listAssignmentsCallback",
            "action": "listAssignments",
            "date": selectedDate,
            "type": schedulerFilters.type,
            "status": schedulerFilters.status,
            "classroomId": schedulerFilters.classroom,
            "title":schedulerFilters.title
        }
    });
}

function listAssignmentsCallback(serverResponseObj, requestObj)
{
    if (serverResponseObj.error)
    {
        alert(serverResponseObj.error);
    }
    if (serverResponseObj.assignments)
    {
        var date = new Date(requestObj.date);
        //CreateBackDate for Module Deletion
        selectedSchedulerDate = date;
        var myMonth = monthStrings[date.getMonth()];
        var myYear = date.getFullYear();
        var myDay = date.getDate();
        var schedulerHTML = "<div class=\"assignmentsHeader\">";
        schedulerHTML += "      <table>";
        schedulerHTML += "          <tr>";
        schedulerHTML += "              <td class=\"tableLeftColumn tableSquare mediumBold\"><span class=\"interfaceFontSize125\">" + myDay + "</span><br><span>" + myMonth + "</span></td>";
        schedulerHTML += "              <td id=\"id_headerTitleCell\"><span class=\"interfaceHeaderTitle textColor_Black\">SCHEDULED</span><br><span class=\"interfaceHeaderTitle textColor_Black\">ASSIGNMENTS</span></td>";
        schedulerHTML += "              <td id=\"assignmentsHeaderControlsCell\" style=\"text-align:right;padding:.25em;\"></td>";
        schedulerHTML += "          </tr>";
        schedulerHTML += "      </table>";
        schedulerHTML += " </div>";
        $("#scheduledAssignmentsHeader").html(schedulerHTML).show();

        var schedulerList = $("#schedulerList");
        schedulerList.html(scheduledFiltersDisplay(schedulerFilters));

        if(serverResponseObj.assignments.length>0){
            for (var i = 0; i < serverResponseObj.assignments.length; i++)
            {
                loadScheduledAssignment(schedulerList, serverResponseObj.assignments[i], i);
            }
        } else {
            schedulerList.append('<div class="schedulerFilterNoResults"><span>No assignments found on selected date.</span><div>')
        }

        var schedulerDateSelectedEvent = $.Event("schedulerDateSelectedEvent");
        schedulerDateSelectedEvent.selectedDate = date;
        $(document).trigger(schedulerDateSelectedEvent);
    }
}

/*THIS FUNCTION IS DUPLICATED IN MYASSIGNMENTS.JS*/
function scheduledFiltersDisplay(schedulerFilters){
    var filterDisplay = "";
    var filters = [];
    for( var key in schedulerFilters ) {
        if(schedulerFilters[key].length > 0 ) {
            if(key == "classroom")
                filters.push( '<span class="activeFilter">'+$("#FilterClassroomDD option[value='"+schedulerFilters[key]+"']").text()+'</span>' )
            else
                filters.push('<span class="activeFilter">'+schedulerFilters[key]+'</span>')
        }
    }
    if(filters.length > 0)
        filterDisplay = spf('<div class="schedulerFilters"><span style="font-weight:600">Active Filters: </span>~<div>', [filters.join(', ')] );
    return filterDisplay
}

function setupCalendar(date)
{
    var rangeDate = selectedDate;
    if (typeof (date) != "undefined")
        rangeDate = date;
    if (typeof (rangeDate) == "object")
        rangeDate = rangeDate.toJSON();
    $.ajax(
    {
        type: "POST",
        dataType: "jsonp",
        url: domainRootPath + "WebServices/Assignment/Assignment.aspx",
        data:
        {
            "jsonpCallback": "setupCalendarCallback",
            "action": "listCalendarAssignments",
            "type": schedulerFilters.type,
            "status": schedulerFilters.status,
            "classroomId": schedulerFilters.classroom,
            "title": schedulerFilters.title,
            "date":rangeDate
        }
    });
}

function setupCalendarCallback(serverResponseObj, requestObj)
{
    if (serverResponseObj.error)
    {
        alert(serverResponseObj.error);
    }
    if (serverResponseObj.assignments)
    {
        $("#schedulerCalendar").calendar({ selectedDate: selectedSchedulerDate, initDate: requestObj.date, dates: serverResponseObj.assignments, onSelectDate: function (selectedDate) { listAssignments(selectedDate); }, onChangeRenderDate: function (calendarMonth) { setupCalendar(calendarMonth); } });
        $("#schedulerLoader").hide();
        $("#schedulerContainerDiv").show();
        //Assign date and call listAssignments()
        selectedDate = selectedSchedulerDate.toJSON();
        listAssignments();
        var schedulerCalendarLoadedEvent = $.Event("schedulerCalendarLoaded");
        $(document).trigger(schedulerCalendarLoadedEvent);
    }
}

function loadScheduledAssignment(containerElement, assignment, index)
{
    var startDate = new Date(assignment.startDate);
    var assignmentMode = "";
    if (assignment.assessment) {
        assignmentMode += " Assessment";
    }
    if (assignment.homework) {
        assignmentMode += " Homework";
    }
    var assignmentTitle;
    if (assignment.title) {
        assignmentTitle = assignment.title;
    } else if (assignment.name) {
        assignmentTitle = assignment.name;
    } else {
        assignmentTitle = "Untitled";
    }

    var assignmentHTML = spf('<div id="assignmentOuterWrapper_~" class="assignmentOuterWrapper">',[assignment.id]);
    assignmentHTML += spf('<div id="assignmentInnerWrapper_~" class="assignmentInnerWrapper">',[assignment.id])


    //HEADER
    assignmentHTML += '<div class="assignmentHeader themeBgrColor_2">'

    assignmentHTML += '<div class="displayTable">'
    assignmentHTML += '<div class="displayTableCell">'
    assignmentHTML += spf('<span style="font-size:.8em; font-weight:500">id:~&nbsp;</span>',[assignment.id])
    assignmentHTML += '<div class="assignmentTitle" style="font-style: italic; font-size:1.2em;">'
    assignmentHTML += assignmentTitle
    assignmentHTML += '</div>'
    assignmentHTML += '</div>'

    //Status
    assignmentHTML += '<div class="displayTableCell" style="text-align:right; padding-top:.25em;">'
    var statusClass = "assignmentStatusUpcoming"
    switch (assignment.status){
        case "InProgress":
        statusClass = "assignmentStatusInProgress"
        break
        case "Complete":
        statusClass = "assignmentStatusComplete"
        break
    }
    if(assignment.status == "Upcoming"){
        statusClass = "assignmentStatusUpcoming"
    }
    assignmentHTML += spf('<span class="~">~</span>',[statusClass, (assignment.status) ? assignment.status : "Status: N/A"])
    assignmentHTML += '</div>'
    assignmentHTML += '</div>'


    assignmentHTML += '<div class="assignmentType ">'
    if(assignment.sectionCount > 1){
        assignmentHTML += '<span>'+assignmentMode+' Sequence '
        assignmentHTML += '<span style="background: #ffffff; color: #333333; padding:0 .25em;">'+assignment.sectionCount+'</span>'
        assignmentHTML += '<span> Sections</sections>'
    } else {
        assignmentHTML += assignmentMode
    }

    assignmentHTML += '</div>'
    assignmentHTML += '</div>'//End Header

    //Classroom
    assignmentHTML += '<div class="configurationDetails" style="background: #ffffff; padding:.5em;">'
    assignmentHTML += '<div class="displayTable">'
    assignmentHTML += '<div class="displayTableRow">';
    assignmentHTML += '<div class="displayTableCell">';
    var assignmentClassroomId = assignment.classroomId;
    var myClassroomTitle = "";
    var myClassroomClassNumber = "";
    for (var i = 0; i < classrooms.length; i++) {
        if (classrooms[i].id == assignmentClassroomId) {
            myClassroomTitle = classrooms[i].title;
            myClassroomClassNumber = classrooms[i].classNumber;
            break;
        }
    }
    assignmentHTML += "<span id=\"id_classroomTitle_"+ assignment.id +"\" class=\"h5_inlineClone\">Classroom:&nbsp</span><span id=\"classroomTitleSpan_" + assignment.id + "\" data-classroomid=\"" + assignment.classroomId + "\">" + myClassroomTitle + " (" + myClassroomClassNumber + ")";
    assignmentHTML += "<span class=\"studentCount\"><span class=\"fa fa-users\"></span><span class=\"mediumBold\">&nbsp;" + assignment.studentCount + "</span></span>";
    assignmentHTML += "</span>"
    assignmentHTML += "</div>";
    assignmentHTML += "</div>";//End Row
    //START, END
    assignmentHTML += '<div class="displayTableRow">';
    assignmentHTML += '<div class="displayTableCell">';
    if (assignment.completeDate) {
        assignmentHTML += "<div>";
        assignmentHTML += "<span id=\"id_startDateTitle_"+ assignment.id +"\" class=\"h5_inlineClone\">Completion Date:&nbsp</span>" + assignment.completeDate + "</span>";
        assignmentHTML += "</div>";
        if(assignment.completionTime > 0){ 
            assignmentHTML += "<div>";
            assignmentHTML += "<span class=\"h5_inlineClone\">Time Limit:</span><span>" + readableCompletionTime(parseInt(assignment.completionTime)) +"min</span>"
            assignmentHTML += "</div>";
            assignmentHTML += "<div>";
            assignmentHTML += assignment.autoSubmit == true ? "<span style=\"color: #ff0000;\">Auto-submit on Completion Enabled</span>":"<span>Auto-submit on Completion Disabled</span>"
            assignmentHTML += "</div>"; 
        }
    }
    else if (assignment.initiateDate) {
        assignmentHTML += "<div>";
        assignmentHTML += "<span id=\"id_startDateTitle_"+ assignment.id +"\" class=\"h5_inlineClone\">Initiate Date:&nbsp</span>" + assignment.initiateDate + "</span>";
        assignmentHTML += "</div>";
        if(assignment.completionTime > 0){ 
            assignmentHTML += "<div>";
            assignmentHTML += "<span class=\"h5_inlineClone\">Time Limit:</span><span>" + readableCompletionTime(parseInt(assignment.completionTime)) +"min</span>"
            assignmentHTML += "</div>";
            assignmentHTML += "<div>";
            assignmentHTML += assignment.autoSubmit == true ? "<span style=\"color: #ff0000;\">Auto-submit on Completion Enabled</span>":"<span>Auto-submit on Completion Disabled</span>"
            assignmentHTML += "</div>"; 
        }
    }
    else {
        assignmentHTML += "<div>";
        assignmentHTML += "<span id=\"id_startDateTitle_"+ assignment.id +"\" class=\"h5_inlineClone\">Scheduled:</span><span class=\"\" id=\"startDateSpan_" + assignment.id + "\">" + assignment.startDate + "</span>";
        assignmentHTML += "</div>";
        assignmentHTML += "<div>";
        assignmentHTML += "<span id=\"id_completionTimeTitle_"+ assignment.id +"\" class=\"h5_inlineClone\">Time Limit:</span><span class=\"\" id=\"completionTimeSpan_" + assignment.id + "\" data-completiontime=\"" + assignment.completionTime + "\">" + ((assignment.completionTime > 0) ? readableCompletionTime(assignment.completionTime) + "&nbsp;min": "none") + "</span>";
        assignmentHTML += "</div>";
        assignmentHTML += "<div>";
        assignmentHTML += "<span id=\"autoSubmitSelector_"+assignment.id+"\" " + ((assignment.completionTime > 0) ? "" : "style=\"display:none;\"") + "><span class=\"h5_inlineClone\">Auto-submit on Completion:</span><span id=\"autoSubmitCB_" + assignment.id + "\" class=\"fa-lg " + (assignment.autoSubmit ? checkboxCheckedIcon : checkboxUncheckedIcon) + "\"></span></span></span>";
        assignmentHTML += "</div>";
    }
    assignmentHTML += "</div>";
    assignmentHTML += "</div>";//End Row
    assignmentHTML += '<div class="displayTableRow">';
    //OPEN BUTTON
    var btnClass = "btnBlue"
    switch (assignment.status){
        case "InProgress":
        btnClass = "btnGreen"
        break
        case "Complete":
        btnClass = "btnRed"
        break
    }
    if(assignment.status == "Upcoming"){
        btnClass = "btnBlue"
    }
    assignmentHTML += '<div class="displayTableCell" style="padding-bottom:.25em; width:100%">'
    assignmentHTML += spf('<div id="id_statusOpenBtn_~" class="~"><i class="fa fa-folder-open" style="margin-right:.25em;"></i>Open ~</div>',[assignment.id, btnClass, assignmentMode])
    assignmentHTML += '</div>'

    //DELETE
    if (!assignment.initiateDate && assignment.studentCount == 0) {
        assignmentHTML += '<div id="assignmentRemoveCell_'+assignment.id+'" class="displayTableCell" style="padding-bottom:.25em;"></div>'
    }
    //RETIRE
    if (assignment.status == "Complete") {
        assignmentHTML += '<div id="assignmentRetireCell_'+assignment.id+'" class="displayTableCell" style="padding-bottom:.25em;"></div>'
    }

    assignmentHTML += '</div>'//End Row
    assignmentHTML += '</div>'//End Table
    assignmentHTML += '</div>'//End Details

    assignmentHTML += '</div>'//End assignmentInnerWrapper
    assignmentHTML += '</div>'//End assignmentOuterWrapper

    containerElement.append(assignmentHTML);
    $("#id_statusOpenBtn_"+assignment.id).on("click",function(){
        window.location.href='ClassAssignment.aspx?assignmentId='+assignment.id;
    })

    var scheduledAssignmentLoadedEvent = $.Event("scheduledAssignmentLoaded");

    scheduledAssignmentLoadedEvent.assignment = assignment;
    $(document).trigger(scheduledAssignmentLoadedEvent);
}

function viewAssignment(assignmentId) {
    $.ajax(
    {
        type: "POST",
        dataType: "jsonp",
        url: domainRootPath + "WebServices/Assignment/Assignment.aspx",
        data:
        {
            "jsonpCallback": "viewAssignmentCallback",
            "action": "view",
            "id": assignmentId
        }
    });
}

function viewAssignmentCallback(serverResponseObj, requestObj)
{
    if (serverResponseObj.error) {
        alert(serverResponseObj.error);
    }
    if (serverResponseObj.assignment)
    {
        assignment = serverResponseObj.assignment;
    }
}

function toggleSchedulerFilters()
{
    var filterAssignmentsDetailsDiv = $("#filterAssignmentsDetailsDiv");
    var filtersAssignmentsToggler = $("#filtersAssignmentsToggler");
    if (filterAssignmentsDetailsDiv.css("display") == "block")
    {
        filtersAssignmentsToggler.html("&#9658;");
        filterAssignmentsDetailsDiv.hide();
    }
    else
    {
        filtersAssignmentsToggler.html("&#9660;");
        filterAssignmentsDetailsDiv.show();
    }
}

function addFilter(filterInput)
{
    filterInput.value = filterInput.value.trim();
    updateFilter(filterInput.id, filterInput.value);
    if ((schedulerFilters.type != "") || (schedulerFilters.status != "") || (schedulerFilters.title != "") || (schedulerFilters.classroom != ""))
        $("#clearSchedulerFiltersBtn").show();
    else
        $("#clearSchedulerFiltersBtn").hide();
    listAssignments();
    setupCalendar();
    setSessionState("schedulerFilters", schedulerFilters, true);
}

function updateFilter(filterInputId, filterValue)
{
    if (filterInputId == "FilterTypeDD") { schedulerFilters.type = filterValue; }
    if (filterInputId == "FilterStatusDD") { schedulerFilters.status = filterValue; }
    if (filterInputId == "FilterTitleTB") { schedulerFilters.title = filterValue; }
    if (filterInputId == "FilterClassroomDD") { schedulerFilters.classroom = filterValue; }
}

function clearFilters()
{
    $("#FilterTypeDD").val("");
    $("#FilterStatusDD").val("");
    $("#FilterTitleTB").val("");
    $("#FilterClassroomDD").val("");
    $("#clearSchedulerFiltersBtn").hide();
    schedulerFilters = { type: "", status: "", classroom: "", title: "" };
    setSessionState("schedulerFilters", schedulerFilters, true);
    listAssignments();
    setupCalendar();
}