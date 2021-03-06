// Notes can be nested (tree structure) to allow for student questions, comments or discussion.
// Sessions could be notes.
// Notes within the same level are ordered.
// Question answers can be sub notes.

// Students can save comments that are not seen by other students.
// A separate "Notes" collection is used.
// Notes keep an ID of their parent in the database.
// The recording API is used to save the state of viewers (ViewerRecord)
// Notes just add a tree structure on top of these states (with GUI).

// Right now we are loading the view and bookmarks as notes.
// Bookmarks have two notes: Question and a child answer.  
// I want to hide the answer in the question note (not show the answer in the GUI).
// My problem is that the answer note does not have enough information to draw
// the Question GUI.  It is buried in the iterator.  I could have a state
// internal to the question note, but this breaks the iterator pattern.
// I am backing out of using the Answer array, but I am not removing it from the code.

// TODO:
// Save order of user notes.
// Detect whether user has permission to save notes.
// Automatically save view changes into application note.
// Automatically save note text and title into application.
// Refresh button to reload the current note. (Reload from database.) (should I refresh children?).
// Link the Save button to store all application notes into database.
// Keep track of whether application notes have been modified.
// Warning pop-up message to save notes when navigating off page.


// Discussion:  We have a local (not saved to server) edit state (turned on by edit and off by cancel).
// Edit is turned off by advancing to the next note or adding a note.  This is confusing.
// Changes are automatically saved locally. Save button saves to server.  This is confusing.


// How about a global lock / unlock button (like quick). Edit -> Clone, Save, Cancel.
// hi (Gwenda)


// Time to make this an object to get rid of all these global variables.
function InitNotesWidget() {  
  NOTES_WIDGET = new NotesWidget();
  if (EDIT) {
    NOTES_WIDGET.EditCallback();  
  }
}


function NotesWidget() {
  var self = this;
  // For animating the display of the notes window (DIV).
  this.WidthFraction = 0.0;
  this.Visibilty = false;

  // Root of the note tree.
  this.RootNote;

  // Iterator is used to implement the next and previous note buttons.
  this.Iterator;
  // For clearing selected GUI setting.
  this.SelectedNote;
  
  // GUI elements
  this.Window;
  this.NoteTreeDiv;
  this.TitleEntry;
  this.TextEntry;
  this.NewButton;
  this.CloneButton;
  this.RandomButton;
  this.DeleteButton;
  this.SaveButton;
  this.EditButton;
  // We need this flag to record view and text into notes when advancing notes.
  this.EditActive = false;
  // We need this flag so cancel will get rid of a pending new note.
  // User can be editing an old note, or a new note.
  this.EditNew = false;
  // Have any notes been modified (and need to be saved to the database)?
  this.Modified = false;

  this.PopupMenuButton;
  this.PopupMenu;

  // It would be nice to animate the transition
  // It would be nice to integrate all animation in a flexible utility.
  this.AnimationLastTime;
  this.AnimationDuration;
  this.AnimationTarget;  

  
  if ( ! MOBILE_DEVICE) {
    this.OpenNoteWindowButton = $('<img>')
      .appendTo('body')
      .css({'position': 'absolute',
            'height': '20px',
            'width': '20px',
            'top' : '0px',
            'right' : '0%',
            'opacity': '0.6',
            'z-index': '3'})
      .attr('src',"webgl-viewer/static/dualArrowRight2.png")
      .click(function(){self.ToggleNotesWindow();});
    VIEWER1.AddGuiObject(this.OpenNoteWindowButton, "Top", 0, "Left", 0);

    this.CloseNoteWindowButton = $('<img>')
      .appendTo('body')
      .css({'position': 'absolute',
            'height': '20px',
            'width': '20x',
            'top' : '0px',
            'right' : '0%',
            'opacity': '0.6',
            'z-index': '3'})
      .hide()
      .attr('src',"webgl-viewer/static/dualArrowLeft2.png")
      .click(function(){self.ToggleNotesWindow();});
    VIEWER1.AddGuiObject(this.CloseNoteWindowButton, "Top", 0, "Left", -20);
  }
  
  this.Window = $('<div>').appendTo('body')
    .css({
      'background-color': 'white',
      'position': 'absolute',
      'top' : '0%',
      'left' : '0%',
      'height' : '100%',
      'width': '20%',
      'z-index': '2'})
    .hide()
    .attr('id', 'NoteWindow');


  this.NoteTreeDiv = $('<div>').appendTo(this.Window)
    .css({
      'position': 'absolute',
      'top' : '0%',
      'left' : '0%',
      'height' : '60%',
      'width': '100%',
      'overflow': 'auto',
      'text-align': 'left',
      'color': '#303030',
      'font-size': '18px'})
    .attr('id', 'NoteTree');
  
    
  // The next three elements are to handle the addition of comments.  Currently placeholders.
  // The top div wraps the text field and the submit button at the bottom of the widget.
  var noteDetailDiv = $('<div>').appendTo(this.Window)
    .css({'position': 'absolute',
          'width': '100%',
          'top': '60%',
          'height': '40%'});
  
  this.TitleEntry = $('<textarea>').appendTo(noteDetailDiv)
                                    .css({'position': 'absolute',
                                          'left': '3px',
                                          'right': '3px',
                                          'height': '20px',
                                          'border-style': 'solid',
                                          'background': '#ffffff',
                                          'resize': 'none'});                                                                                    
  this.TextEntry = $('<textarea>').appendTo(noteDetailDiv)
                                   .css({'position': 'absolute',
                                         'left': '3px',
                                         'right': '3px',
                                         'top': '26px',
                                         'bottom': '43px',
                                         'border-style': 'solid',
                                         'background': '#ffffff',
                                         'resize': 'none'});
  this.TitleEntry.attr('readonly', 'readonly');
  this.TextEntry.attr('readonly', 'readonly');

  var buttonWrapper = $('<div>').appendTo(noteDetailDiv)
                                       .css({'position': 'absolute',
                                             'width': '100%',
                                             'height': '40px',
                                             'bottom': '0px'});
  
  // Only visible when in edit mode.
  this.PopupMenuButton = $('<div>').appendTo(buttonWrapper)
                                .hide()
                                .css({'position': 'relative',
                                      'float': 'right',
                                      'margin': '5px'});
  this.EditButton = $('<button>').appendTo(buttonWrapper)
                                .text("Edit")
                                .css({'color' : '#278BFF',
                                      'font-size': '18px',
                                      'position': 'relative',
                                      'float': 'right',
                                      'margin': '5px'})
                                .click(function(){self.EditCallback();});
  this.NewButton = $('<button>').appendTo(buttonWrapper)
                                .hide()
                                .text("New")
                                .css({'color' : '#278BFF',
                                      'font-size': '18px',
                                      'position': 'relative',
                                      'float': 'right',
                                      'margin': '5px'})
                                .click(function(){self.NewCallback();});

  // For less used buttons that appear when mouse is over the pulldown button.
  // I would like to make a dynamic bar that puts extra buttons into the pulldown as it resizes.
  this.PopupMenu = $('<div>').appendTo(this.PopupMenuButton)
                       .css({'position': 'absolute',
                             'left': '0px',
                             'bottom': '0px',
                             'background-color': 'white',
                             'padding': '5px 5px 30px 5px',
                             'border-radius': '8px',
                             'border-style': 'solid',
                             'border-width':'1px'})
                       .hide()
                       .mouseleave(function(){
                          var self = $(this),
                          timeoutId = setTimeout(function(){NOTES_WIDGET.PopupMenu.fadeOut();}, 650);
                          //set the timeoutId, allowing us to clear this trigger if the mouse comes back over
                          self.data('timeoutId', timeoutId);  })
                       .mouseenter(function(){
                          clearTimeout($(this).data('timeoutId')); });                       

  this.DeleteButton = $('<button>').appendTo(this.PopupMenu)
                                .hide()
                                .text("Delete")
                                .css({'color' : '#278BFF', 'width':'100%','font-size': '18px'})
                                .click(function(){self.DeleteCallback();});

  this.CloneButton = $('<button>').appendTo(this.PopupMenu)
                                .hide()
                                .text("Clone")
                                .css({'color' : '#278BFF', 'width':'100%','font-size': '18px'})
                                .click(function(){self.CloneCallback();});

  this.RandomButton = $('<button>').appendTo(this.PopupMenu)
                                .hide()
                                .text("Randomize")
                                .css({'color' : '#278BFF', 'width':'100%','font-size': '18px'})
                                .click(function(){self.RandomCallback();});

  this.SaveButton = $('<button>').appendTo(this.PopupMenu)
                                  .hide()
                                  .text("Save")
                                  .css({'color' : '#278BFF', 'width':'100%','font-size': '18px'})
                                  .click(function(){self.SaveCallback();});
                       
  var popupMenuButtonImage = $('<img>').appendTo(this.PopupMenuButton)
    .css({'height': '30px',
          'width': '30x',
          'opacity': '0.6'})
    .attr('src',"webgl-viewer/static/dropDown1.jpg")
    .mouseenter(function() {NOTES_WIDGET.PopupMenu.fadeIn(); });

  // This sets "this.RootNote" and "this.Iterator"
  this.LoadViewId(VIEW_ID);
  // Setup the iterator using the view as root.
  // Bookmarks (sub notes) are loaded next.
  this.Iterator = this.RootNote.NewIterator(); 
}

//------------------------------------------------------------------------------
// Iterator to perform depth first search through note tree.
// Collapsed branches (children not visible) are not traversed.
// This iterator is a bit over engineered.  I made it so we can subclasses
// that iterate over internal states.  However, internal states require
// notes so I made an array of answers (which are hidden).
function NoteIterator(note) {
  this.Note = note;
  this.IteratingAnswers = false;
  this.ChildIterator = null;
}

// Because of sorting, the child array gets reset on us.
// I need a dynamic way to get the Children or Answers array based on the state.
NoteIterator.prototype.GetChildArray = function() {
  if ( ! this.Note) {
    return [];
  }
  if (this.IteratingAnswers) {
    return this.Note.Answers;
  }
  return this.Note.Children;
}

// Because of sorting, I have to make the index dynamic
// and it cannot be stored as an ivar.
NoteIterator.prototype.GetChildIndex = function() {
  if (this.ChildIterator == null) {
    return -1;
  }
  return this.GetChildArray().indexOf( this.ChildIterator.Note );
}



NoteIterator.prototype.GetNote = function() {
  if (this.ChildIterator != null) { 
    return this.ChildIterator.GetNote();
  }
  return this.Note;
}

// Get the parent note of the current note.
// Notes do not keep a pointer to parents.
// The iterator has this information for active notes.
NoteIterator.prototype.GetParentNote = function() {
  if (this.ChildIterator == null) {
    // We are at the current note.  Let the caller supply the parent.
    return null;
  }

  var parent = this.ChildIterator.GetParentNote();
  if (parent == null) {
    // This level contains the parent.
    parent = this.Note;
  }

  return parent;
}


// We use this to see (peek) if next or previous should be disabled.
NoteIterator.prototype.IsStart = function() {
  if (this.ChildIterator == null) { 
    return true;
  }
  return false;
}


NoteIterator.prototype.IsEnd = function() {
  // Case note is active.
  if (this.ChildIterator == null) {
    // Always iterate through answers
    if (this.Note.Answers.length > 0) {
      return false;
    }
    if (this.Note.Children.length > 0 && this.Note.ChildrenVisibility) {
      return false;
    }
    return true;
  }

  // sub answer is active.
  var childIndex = this.GetChildIndex();
  if (this.IteratingAnswers) {
    if (this.Note.Children.length > 0 && this.Note.ChildrenVisibility) {
      // We have children which come after answers.
      return false;
    } 
    // No children.  Answer array is the last. Check is current is last answer.
    if (childIndex == this.GetChildArray().length - 1) {
      return this.ChildIterator.IsEnd();
    }
    // More answers after current.
    return false;
  }
  
  // sub child is active
  if (childIndex == this.GetChildArray().length - 1) {
    return this.ChildIterator.IsEnd();
  }
  return false;
}


// Parent note is traversed before children.
// Move forward one step.  Return the new note. At end the last note returned again. 
// IsEnd method used to detect terminal case.
NoteIterator.prototype.Next = function() {
  // Case 1:  Iterator is on its own node.
  if (this.ChildIterator == null) {
    // First check for answers
    if (this.Note.Answers.length > 0) {
      // Move to the first answer.
      this.IteratingAnswers = true;
      this.ChildIterator = this.GetChildArray()[0].NewIterator();
      return this.ChildIterator.GetNote();
    }
    // Next check for children notes
    if (this.Note.Children.length > 0 && this.Note.ChildrenVisibility) {
      // Move to the first child.
      this.IteratingAnswers = false;
      this.ChildIterator = this.GetChildArray()[0].NewIterator();
      return this.ChildIterator.GetNote();
    }
    // No answers or children: we are at the end.
    return this.Note;
  }

  // Try to advance the child iterator.
  if ( ! this.ChildIterator.IsEnd()) {
    return this.ChildIterator.Next();
  }

  // Child iterator is finished.  
  // Try to create a new iterator with the next child in the array.
  var childIndex = this.GetChildIndex();
  if (childIndex < this.GetChildArray().length-1) {
    this.ChildIterator = this.GetChildArray()[childIndex+1].NewIterator();
    return this.ChildIterator.GetNote();
  }
  
  // Move from answers to children
  if (this.IteratingAnswers && 
      this.Note.Children.length > 0 && 
      this.Note.ChildrenVisibility) {
    this.IteratingAnswers = false;
    this.ChildIterator = this.Note.Children[0].NewIterator();
    return this.ChildIterator.GetNote();
  }
  
  // We are at the end of the children array.
  return this.ChildIterator.GetNote();
}


// Move backward one step.  See "Next" method comments for description of tree traversal.
NoteIterator.prototype.Previous = function() {
  if (this.ChildIterator == null) {
    // At start.
    return this.Note;
  }
  if ( ! this.ChildIterator.IsStart()) {
    return this.ChildIterator.Previous();
  }

  // Move to the previous child.
  var childIndex = this.GetChildIndex() - 1;
  if (childIndex >= 0) {
    this.ChildIterator = this.GetChildArray()[childIndex].NewIterator();
    this.ChildIterator.ToEnd();
    return this.ChildIterator.GetNote();
  }
  
  // We are at the begining of an array.
  // If we are in the child array, try to move to the answer array
  if ( ! this.IteratingAnswers && this.Note.Answers.length > 0) {
    this.IteratingAnswers = true;
    var childIndex = this.GetChildArray().length -1;
    this.ChildIterator = this.GetChildArray()[childIndex].NewIterator();
    this.ChildIterator.ToEnd();
    return this.ChildIterator.GetNote();
  }

  // No more sub notes left.  Move to the root.
  this.ChildIterator = null;
  this.IteratingAnswers = false;
  return this.Note;
}    


// Move the iterator to the end. Used in Previous method.
NoteIterator.prototype.ToEnd = function() {
  if (this.Note.Children.length > 0 && this.Note.ChildrenVisibility) {
    this.ChildArray = this.Note.Children;
    var childIndex = this.ChildArray.length - 1;
    this.ChildIterator = this.ChildArray[childIndex].NewIterator();
    return this.ChildIterator.ToEnd();
  }
  if (this.Note.Answers.length > 0) {
    this.ChildArray = this.Note.Answers;
    var childIndex = this.ChildArray.length - 1;
    this.ChildIterator = this.ChildArray[childIndex].NewIterator();
    return this.ChildIterator.ToEnd();
  }
  // leaf note
  this.ChildArray = null;
  this.ChildIterator = null;
  return this.Note;
}



//------------------------------------------------------------------------------
// Note object (maybe will be used for views and sessions too).

// data is the object retrieved from mongo (with string ids)
// Right now we expect bookmarks, but it will be generalized later.
function Note () {
  this.User = GetUser(); // Reset by flask.
  var d = new Date();
  this.Date = d.getTime(); // Also reset later.
  this.Type = "Note";
  
  
  this.Title = "";
  this.Text = "";
  // Upto two for dual view.
  this.ViewerRecords = [];

  // Hidden children for questions.
  this.Answers = [];
  
  // Sub notes
  this.Children = [];
  this.ChildrenVisibility = true;

  // GUI elements.
  this.Div = $('<div>').attr({'class':'note'});

  this.Icon = $('<img>').css({'height': '20px',
                              'width': '20x',
                              'float':'left'})
                        .attr('src',"webgl-viewer/static/dot.png")
                        .appendTo(this.Div);
  this.TitleDiv = $('<div>').css({'font-size': '18px',
                                 'margin-left':'20px',
                                 'color':'#379BFF',})
                           .text(this.Title)
                           .appendTo(this.Div);
  // The div should attached even if nothing is in it.
  // A child may appear and UpdateChildrenGui called.
  // If we could tell is was removed, UpdateChildGUI could append it.
  this.ChildrenDiv = $('<div>').css({'margin-left':'15px'})
                               .appendTo(this.Div);

}


Note.prototype.UserCanEdit = function() {
  return EDIT;
}


Note.prototype.RecordView = function() {
  this.ViewerRecords = [];
  //  Viewer1
  var viewerRecord = new ViewerRecord();
  viewerRecord.CopyViewer(VIEWER1);
  this.ViewerRecords.push(viewerRecord);
  // Viewer2
  if (DUAL_VIEW) {
    var viewerRecord = new ViewerRecord();
    viewerRecord.CopyViewer(VIEWER2);
    this.ViewerRecords.push(viewerRecord);
  }
}


Note.prototype.AddChild = function(childNote, first) {
  // Needed to get the order after a sort.
  childNote.Div.data("index", this.Children.length);

  if (first) {
    this.Children.splice(0, 0, childNote);
  } else {
    this.Children.push(childNote);
  }

  this.UpdateChildrenGUI();
}

Note.prototype.UpdateChildrenGUI = function() {
  // Callback trick
  var self = this;

  // Clear
  this.ChildrenDiv.empty();
  if (this.Children.length == 0) {
    this.Icon.attr('src',"webgl-viewer/static/dot.png");
    return;
  }
  if (this.ChildrenVisibility == false) {
    this.Icon.attr('src',"webgl-viewer/static/plus.png")
             .click(function() {self.Expand();});
    return;
  }
  
  // Redraw
  this.Icon.attr('src',"webgl-viewer/static/minus.png")
           .click(function() {self.Collapse();});
  for (var i = 0; i < this.Children.length; ++i) {
    this.Children[i].DisplayGUI(this.ChildrenDiv);
  } 

  if (this.Children.length > 1 && this.UserCanEdit() && NOTES_WIDGET.EditActive) {
    // Make sure the indexes are set correctly.
    for (var i = 0; i < this.Children.length; ++i) {
      this.Children[i].Div.data("index", i);
    }
    this.ChildrenDiv.sortable({axis: "y",
                               containment: "parent",
                               update: function( event, ui ){self.ReorderChildren();}});
    // Indicate the children are sortable...
    this.ChildrenDiv.css({'border-left': '2px solid #00a0ff'});
  }
  
}

// So this is a real pain.  I need to get the order of the notes from
// the childrenDiv jquery element.
// I could use jQuery.data(div,"note",this) or store the index in an attribute.
Note.prototype.ReorderChildren = function() {
  var newChildren = [];
  var children = this.ChildrenDiv.children();
  for (var newIndex = 0; newIndex < children.length; ++newIndex) {
    var oldIndex = $(children[newIndex]).data('index');
    var note = this.Children[oldIndex];
    note.Div.data("index", newIndex);
    if (newIndex != oldIndex) {
      NOTES_WIDGET.NoteModified();
    }
    newChildren.push(note);
  }
 
  this.Children = newChildren;
}


Note.prototype.NewIterator = function() {
  return new NoteIterator(this);
}

Note.prototype.Contains = function(decendent) {
  for (var i = 0; i < this.Children.length; ++i) {
    var child = this.Children[i];
    if (child == decendent) {
      return true;
    }
    if (child.Contains(decendent)) {
      return true;
    }
  }
  return false;
}

// This should method should be split between Note and NotesWidget
Note.prototype.Select = function() {
  if (NOTES_WIDGET.Iterator.GetNote() != this) {
    // For when user selects a note from a list.
    // Find the note and set a new iterator
    // This is so the next and previous buttons will behave.
    var iter = NOTES_WIDGET.RootNote.NewIterator();
    while (iter.GetNote() != this) {
      if ( iter.IsEnd()) {
        alert("Could not find note.");
        return;
      }
      iter.Next();
    }
    NOTES_WIDGET.Iterator = iter;    
  }

  // Handle the note that is being unselected.
  // Clear the selected background of the deselected note.
  if (NOTES_WIDGET.SelectedNote) {
    NOTES_WIDGET.SelectedNote.TitleDiv.css({'background':'white'});
    if (NOTES_WIDGET.EditActive && NOTES_WIDGET.SelectedNote.UserCanEdit()) {
      NOTES_WIDGET.SelectedNote.RecordGUIChanges();
      NOTES_WIDGET.NoteModified();     
    }
  }
  
  NOTES_WIDGET.RandomButton.hide();
  if (this.UserCanEdit() && NOTES_WIDGET.EditActive) {
    NOTES_WIDGET.TitleEntry.removeAttr('readonly');
    NOTES_WIDGET.TitleEntry.css({'border-style': 'inset',
                          'background': '#f5f8ff'});
    NOTES_WIDGET.TextEntry.removeAttr('readonly');
    NOTES_WIDGET.TextEntry.css({'border-style': 'inset',
                         'background': '#f5f8ff'});
    NOTES_WIDGET.DeleteButton.show();  
    if (this.Children.length > 1 && this.ChildrenVisibility) {
      NOTES_WIDGET.RandomButton.show();
    }
  } else {
    NOTES_WIDGET.TitleEntry.attr('readonly', 'readonly');
    NOTES_WIDGET.TitleEntry.css({'border-style': 'solid',
                          'background': '#ffffff'});
    NOTES_WIDGET.TextEntry.attr('readonly', 'readonly');
    NOTES_WIDGET.TextEntry.css({'border-style': 'solid',
                         'background': '#ffffff'});
    NOTES_WIDGET.DeleteButton.hide();  
  }

  if (this == NOTES_WIDGET.RootNote){
    // We do not allow the user to delete the root note / slide.
    // We need a session editor to do that.
    NOTES_WIDGET.DeleteButton.hide();
    // Interesting:  TODO: If we clone the root, then a new slide is created.
    NOTES_WIDGET.CloneButton.hide();
  } else if (NOTES_WIDGET.EditActive) {
    NOTES_WIDGET.CloneButton.show();
  }
  
  NOTES_WIDGET.SelectedNote = this;
  // Indicate which note is selected.
  this.TitleDiv.css({'background':'#f0f0f0'});
  // Put the note into the details section.
  NOTES_WIDGET.TitleEntry.val(this.Title);
  NOTES_WIDGET.TextEntry.val(this.Text);
  
  if (NAVIGATION_WIDGET) {NAVIGATION_WIDGET.Update(); }

  this.DisplayView();
}


Note.prototype.RecordGUIChanges = function () {
  this.Title = NOTES_WIDGET.TitleEntry.val();
  this.TitleDiv.text(NOTES_WIDGET.SelectedNote.Title);
  this.Text = NOTES_WIDGET.TextEntry.val();
  this.RecordView();
}


// No clearing.  Just draw this notes GUI in a div.
Note.prototype.DisplayGUI = function(div) {
  // Put an icon to the left of the text.
  var self = this;
  this.Div.appendTo(div);

  var self = this;
  
  this.TitleDiv.text(this.Title);
  this.TitleDiv.click(function() {self.Select()});
  this.TitleDiv.hover(function(){self.TitleDiv.css({'text-decoration':'underline'});},
                     function(){self.TitleDiv.css({'text-decoration':'none'});});
                     
  this.UpdateChildrenGUI();
}



Note.prototype.Serialize = function(includeChildren) {
  var obj = {};
  obj.Type = this.Type;
  obj.User = this.User;
  obj.Date = this.Date;
  obj.ParentId = this.ParentId;
  obj.Title = this.Title;
  obj.HiddenTitle = this.HiddenTitle;
  obj.Text = this.Text;
  // We should probably serialize the ViewerRecords too.
  obj.ViewerRecords = this.ViewerRecords;

  //obj.Answers = [];
  //for (var i = 0; i < this.Answers.length; ++i) {
  //  obj.Answers.push(this.Answers[i].Serialize());
  //}

  if (includeChildren) {
    obj.Children = [];
    for (var i = 0; i < this.Children.length; ++i) {
      obj.Children.push(this.Children[i].Serialize(includeChildren));
    }
  }
  return obj;
}

// This method of loading is causing a pain.
// Children ...
Note.prototype.Load = function(obj){
  for (ivar in obj) {
    this[ivar] = obj[ivar];
  }
  this.TitleDiv.text(this.Title);
  //for (var i = 0; i < this.Answers.length; ++i) {
  //  var answerObj = this.Answers[i];
  //  this.Answers[i] = new Note();
  //  this.Answers[i].Load(answerObj);
  //}
  for (var i = 0; i < this.Children.length; ++i) {
    var childObj = this.Children[i];
    var childNote = new Note();
    childNote.Load(childObj);
    this.Children[i] = childNote;
    childNote.Div.data("index", i);
  }
  // Because we are not using add child.
  if (this.Children.length > 1 && this.UserCanEdit() && NOTES_WIDGET.EditActive) {
    var self = this;
    this.ChildrenDiv.sortable({axis: "y",
                               containment: "parent",
                               update: function( event, ui ){self.ReorderChildren();}});                               
  }

  for (var i = 0; i < this.ViewerRecords.length; ++i) {
    if (this.ViewerRecords[i]) {
      obj = this.ViewerRecords[i];
      // It would be nice to have a constructor that took an object.
      this.ViewerRecords[i] = new ViewerRecord();
      this.ViewerRecords[i].Load(obj);
    }
  }

  // Hack to fix timing (Load after select)
  if (this == NOTES_WIDGET.RootNote) {
    NOTES_WIDGET.DisplayRootNote();
  }
}


Note.prototype.LoadViewId = function(viewId) {
  var self = this;
  $.ajax({
    type: "get",
    url: "/webgl-viewer/getview",
    data: {"sessid": localStorage.sessionId,
           "viewid": viewId,
           "db"  : GetSessionDatabase()},
    success: function(data,status) { self.Load(data);},
    error: function() { alert( "AJAX - error() : getview" ); },
    });  
}

// Get any children notes (this note as parent)
// Authored by the current user.
// The notes will have no order.
// The server knows who the user is.
Note.prototype.RequestUserNotes = function() {
  var self = this;
  $.ajax({
    type: "get",
    url: "/webgl-viewer/getchildnotes",
    data: {"parentid": this.Id,
           "db"  : GetSessionDatabase()},
    success: function(data,status) { self.LoadUserNotes(data);},
    error: function() { alert( "AJAX - error() : getchildnotes" ); },
    });  
}


Note.prototype.LoadUserNotes = function(data) {
  for (var i = 0; i < data.Notes.length; ++i) {
    var noteData = data.Notes[i];
    var note = new Note();
    note.Load(noteData);
    this.Children.push(note);
    this.UpdateChildrenGUI();

    note.RequestUserNotes();
  }
}

Note.prototype.Collapse = function() {
  this.ChildrenVisibility = false;
  if (this.Contains(NOTES_WIDGET.SelectedNote)) {
    // Selected note should not be in collapsed branch.
    // Make the visible ancestor active.
    this.Select();
  }
  this.UpdateChildrenGUI();
  NAVIGATION_WIDGET.Update();
}

Note.prototype.Expand = function() {
  this.ChildrenVisibility = true;
  this.UpdateChildrenGUI();
  NAVIGATION_WIDGET.Update();
}

// Set the state of the WebGL viewer from this notes ViewerRecords.
Note.prototype.DisplayView = function() { 
  // Remove Annotations from the previous note.
  VIEWER1.Reset();
  VIEWER2.Reset();

  SetNumberOfViews(this.ViewerRecords.length);

  if (this.ViewerRecords.length > 0) {
    this.ViewerRecords[0].Apply(VIEWER1);
  }
  if (this.ViewerRecords.length > 1) {
    this.ViewerRecords[1].Apply(VIEWER2);
  } else {
    // Default source.
    VIEWER2.SetCache(VIEWER1.GetCache());
  }
}


NotesWidget.prototype.SaveUserNote = function() {
  // Create a new note.
  var childNote = new Note();
  var d = new Date();
  this.Date = d.getTime(); // Also reset later.

  childNote.Text = this.TextEntry.val();
  this.TextEntry.val("");
  childNote.ViewerRecords = [];
  //  Viewer1
  var viewerRecord = new ViewerRecord();
  viewerRecord.CopyViewer(VIEWER1);
  childNote.ViewerRecords.push(viewerRecord);
  // Viewer2
  if (DUAL_VIEW) {
    var viewerRecord = new ViewerRecord();
    viewerRecord.CopyViewer(VIEWER2);
    childNote.ViewerRecords.push(viewerRecord);
  }
  
  // Now add the note as the last child to the current note.
  parentNote = this.Iterator.GetNote();
  parentNote.Children.push(childNote);
  // ParentId is how we retrieve notes from the database.
  // It is the only tree structure saved.
  childNote.ParentId = parentNote.Id;
  // Expand the parent so that the new note is visible.
  parentNote.ChildrenVisible = true;

  // Save the note in the database for this specific user.
  // TODO: If author privileges, save note in the actual session / view.
  var bug = JSON.stringify( childNote );
  $.ajax({
    type: "post",
    url: "/webgl-viewer/saveusernote",
    data: {"note": JSON.stringify(childNote.Serialize(false)),
           "date": d.getTime()},
    success: function(data,status) { childNote.Id = data;},
    error: function() { alert( "AJAX - error() : saveusernote" ); },
    });  
  
  // Redraw the GUI. should we make the parent or the new child active?
  // If we choose the child, then we need to update the iterator,
  // which will also update the gui and viewers.
  NAVIGATION_WIDGET.NextNote();
}


NotesWidget.prototype.SaveBrownNote = function() {
  // Create a new note.
  var note = new Note();
  note.RecordGUIChanges();
  
  // The note will want to know its context
  parentNote = this.Iterator.GetNote();
  note.ParentId = parentNote.Id;

  // Save the note in the admin database for this specific user.
  $.ajax({
    type: "post",
    url: "/webgl-viewer/saveusernote",
    data: {"note": JSON.stringify(note.Serialize(false))},
    success: function(data,status) { note.Id = data;},
    error: function() { alert( "AJAX - error() : saveusernote" ); },
    });  
}





NotesWidget.prototype.NoteModified = function () {
  this.Modified = true;
}

NotesWidget.prototype.ToggleNotesWindow = function() {
  this.Visibilty = ! this.Visibilty;
  RecordState();

  if (this.Visibilty) {
    this.AnimationCurrent = this.WidthFraction;
    this.AnimationTarget = 0.2;
  } else {
    this.Window.hide();
    this.AnimationCurrent = this.WidthFraction;
    this.AnimationTarget = 0.0;
  }
  this.AnimationLastTime = new Date().getTime();
  this.AnimationDuration = 1000.0;
  this.AnimateNotesWindow();
}


// Add a user note to the currently selected notes children.
NotesWidget.prototype.NewCallback = function() {
  // Create a new note.
  var childNote = new Note();
  childNote.Title = "New Note";
  var d = new Date();
  childNote.Date = d.getTime(); // Temporary. Set for real by server.

  // Save the state of the viewers.
  childNote.ViewerRecords = [];
  //  Viewer1
  var viewerRecord = new ViewerRecord();
  viewerRecord.CopyViewer(VIEWER1);
  childNote.ViewerRecords.push(viewerRecord);
  // Viewer2
  if (DUAL_VIEW) {
    var viewerRecord = new ViewerRecord();
    viewerRecord.CopyViewer(VIEWER2);
    childNote.ViewerRecords.push(viewerRecord);
  }
  
  // Now add the note as the last child to the current note.
  parentNote = this.Iterator.GetNote();
  parentNote.AddChild(childNote, true);
  // ParentId is how we retrieve notes from the database.
  // It is the only tree structure saved.
  childNote.ParentId = parentNote.Id;
  // Expand the parent so that the new note is visible.
  parentNote.ChildrenVisibility = true;
  parentNote.UpdateChildrenGUI();
  
  childNote.Select();
}

// Randomize the order of the children
NotesWidget.prototype.RandomCallback = function() {
  var note = this.Iterator.GetNote();
  note.Children.sort(function(a,b){return Math.random() - 0.5;});
  note.UpdateChildrenGUI();
}

// Add a sibling note.
// Do not copy children (maybe in the future?)
NotesWidget.prototype.CloneCallback = function() {
  var parentNote = this.Iterator.GetParentNote();
  if ( ! parentNote) { return; }
  var note = this.Iterator.GetNote();
  var index = parentNote.Children.indexOf(note);
  if (index < 0) { return; }

  // Record any changes before we clone the note.
  note.RecordGUIChanges();
 
  // Create a new note.
  var newNote = new Note();
  newNote.Title = note.Title;
  var d = new Date();
  newNote.Date = d.getTime(); // Temporary. Set for real by server.

  this.TitleEntry.val(newNote.Title);
  this.TextEntry.val(newNote.Text);
  
  // Save the state of the viewers.
  newNote.ViewerRecords = [];
  //  Viewer1
  var viewerRecord = new ViewerRecord();
  viewerRecord.CopyViewer(VIEWER1);
  newNote.ViewerRecords.push(viewerRecord);
  // Viewer2
  if (DUAL_VIEW) {
    var viewerRecord = new ViewerRecord();
    viewerRecord.CopyViewer(VIEWER2);
    newNote.ViewerRecords.push(viewerRecord);
  }
  
  // Now insert the child after the current note.
  parentNote.Children.splice(index+1,0,newNote);
  // ParentId is how we retrieve notes from the database.
  // It is the only tree structure saved.
  newNote.ParentId = parentNote.Id;
  parentNote.UpdateChildrenGUI();
  
  newNote.Select();
}



// TODO: Activate and inactivate save button based on user owning note
// This callback is for both the edit and cancel behaviours.
NotesWidget.prototype.EditCallback = function() {
  if (MOBILE_DEVICE) { return; }

  this.EditActive = true;

  this.EditButton.hide();
  this.PopupMenuButton.show();  
  this.NewButton.show();
  this.SaveButton.show();
  // This handles making the note editable (including showing and hiding the delete button).
  if (this.SelectedNote) {
    this.SelectedNote.Select();
  }
  
  // This handles making children sortable.
  var iter = this.RootNote.NewIterator();
  do {
    var note = iter.GetNote();
    note.UpdateChildrenGUI();
    iter.Next();
  } while ( ! iter.IsEnd());

  window.onbeforeunload = function () {
    if (this.EditActive && this.SelectedNote.UserCanEdit()) {
      this.SelectedNote.RecordGUIChanges();
    }
    return "Some changes have not been saved to the database.";
  }  
}

// TODO: Activate and inactivate save button based on whether anything has changed.
NotesWidget.prototype.SaveCallback = function() {
  this.PopupMenu.hide();

  if (this.EditActive && this.SelectedNote.UserCanEdit()) {
    this.SelectedNote.RecordGUIChanges();
  }
  
  var d = new Date();
  
  // If user owns the root note, then upload all notes to the view.
  if (this.RootNote.UserCanEdit()) {
    // Save this users notes in the user specific collection.
    var noteObj = JSON.stringify(this.RootNote.Serialize(true));
    $.ajax({
      type: "post",
      url: "/webgl-viewer/saveviewnotes",
      data: {"note" : noteObj,
             "db"   : GetSessionDatabase(),
             "view" : GetViewId(),
             "date" : d.getTime()},
      success: function(data,status) {},
      error: function() { alert( "AJAX - error() : saveviewnotes" ); },
      });  
  } else {
    // Save just the users notes to the notes collection.    
    // Save all of the users notes in the database for this specific user.
    // Save this users notes in the user specific collection.
    var iter = this.RootNote.GetIterator();
    do {
      var note = iter.GetNote();
      if (note.UserCanEdit()) {
        $.ajax({
          type: "post",
          url: "/webgl-viewer/saveusernote",
          data: {"note": JSON.stringify(note.Serialize(false)),
                 "db"  : GetSessionDatabase(),
                 "date": d.getTime()},
          success: function(data,status) { note.Id = data;},
          error: function() { alert( "AJAX - error(): saveusernote" ); },
          });  
      }
    } while(iter.IsEnd());
  }
  
  window.onbeforeunload = null;
  this.Modified = false;
  this.EditActive = false;
  
  this.PopupMenuButton.hide();
  this.SaveButton.hide();
  this.CloneButton.hide();
  this.DeleteButton.hide();
  this.NewButton.hide();
  this.EditButton.show();
  this.SelectedNote.Select();
}

// TODO: Disable button when we are not the root note or we do not own the note.
NotesWidget.prototype.DeleteCallback = function() {
  this.PopupMenu.hide();

  this.NoteModified();
  
  var parent = this.Iterator.GetParentNote();
  if (parent == null) {
    return;
  }
  var note = this.Iterator.GetNote();
  
  // Move the current note off this note.
  // There is always a previous.
  NAVIGATION_WIDGET.PreviousNote();

  // Get rid of the note.
  var index = parent.Children.indexOf(note);
  parent.Children.splice(index, 1);

  // If this user does not own the lesson, 
  // then immediatley remove the note from the database.
  // Lesson autho will have to select save to change the database.
  /* Should we immediately change the database, or wait until the user selects save?
  $.ajax({
    type: "post",
    url: "/webgl-viewer/deleteusernote",
    data: {"id"  : note.Id,
           "db"  : GetSessionDatabase()},
    success: function(data,status) {},
    error: function() { alert( "AJAX - error()" ); },
    });  
  */
  
  // Redraw the GUI.
  parent.UpdateChildrenGUI();
}

NotesWidget.prototype.CheckForSave = function() {
  if (this.EditActive && this.SelectedNote.UserCanEdit()) {
    this.SelectedNote.RecordGUIChanges();
    this.NoteModified();
  }

  if (this.Modified) {
    var message = "Save changes in database?\n\nPress Cancel to discard changes.";
    if (confirm(message)) { SaveCallback(); }
  }
  return true;
}


NotesWidget.prototype.AnimateNotesWindow = function() {
  var timeStep = new Date().getTime() - this.AnimationLastTime;
  if (timeStep > this.AnimationDuration) {
    // end the animation.
    this.WidthFraction = this.AnimationTarget;
    handleResize();
    if (this.Visibilty) {
      this.CloseNoteWindowButton.show();
      this.OpenNoteWindowButton.hide();
      this.Window.fadeIn();
    } else {
      this.CloseNoteWindowButton.hide();
      this.OpenNoteWindowButton.show();
    }    
    draw();
    return;
  }
  
  var k = timeStep / this.AnimationDuration;
    
  // update
  this.AnimationDuration *= (1.0-k);
  this.WidthFraction += (this.AnimationTarget-this.WidthFraction) * k;
  
  handleResize();
  draw();
  var self = this;
  requestAnimFrame(function () {self.AnimateNotesWindow();});
}

// Called when a new slide/view is loaded.
NotesWidget.prototype.DisplayRootNote = function() {
  this.NoteTreeDiv.empty();
  this.RootNote.DisplayGUI(this.NoteTreeDiv);
  this.RootNote.Select();
}

NotesWidget.prototype.LoadViewId = function(viewId) {
  VIEW_ID = viewId;
  this.RootNote = new Note();
  if (typeof(viewId) != "undefined" && viewId != "") {
    this.RootNote.LoadViewId(viewId);
  }
  // Since loading the view is asynchronous,
  // the this.RootNote is not complete at this point.  
}


  
