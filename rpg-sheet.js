

// Contents
// function exportSheet();
// function importSheet();
// function importCheckFirst();
// function newSheet(sheetName, sheetData);
// function promptImage(e);
// function setImages();
// function autoSizeInput(event);
// function browserCheck();
// function getSheetOptions();

var dirtyForm = false; // initialize form dirty state as clean
// https://github.com/marioizquierdo/jquery.serializeJSON/issues/32#issuecomment-71833934

(function($)
{ 
  $.fn.deserializeJSON = function(s)
  {
    console.log(s);
    $(this).find("input, select, textarea").each(
      function()
      {
        let o = s;
        let match;
        let name = this.name;
        if (match = name.match(/^(.*):([^:]+)$/))
        {
          name = match[1];
        }
        
        let names = [];
        if (name.indexOf("[") > -1)
        {
          names.push(name.substring(0, name.indexOf("[")));
          if (match = name.match(/\[([^\]]+)\]/g))
          {
            for (let i = 0; i < match.length; i++)
            {
              names.push(match[i].substring(1, match[i].length - 1));
            }
          }
        }
        else
        {
          names.push(name);
        }
              
        for (let i = 0; i < names.length; i++)
        {
          o = o[names[i]];
          if(o == null) return;
        }
              
        if (names.length > 0 && o != null)
        {
          if ($(this).is("[type=checkbox]"))
          {
            if (o.toString() === "false")
            {
              if ($(this).is(":checked"))
              {
                $(this).click();
              }
            }
            else
            {
              if(!$(this).is(":checked"))
              {
                $(this).click();
              }
            }
          }
          else
          {
            if ($(this).is(".modifier"))
            {
              if (o > 0)
              {
                o = "+" + o;
              }
            }

            $(this).val(o);
          }
        }
      }
    );
  };
})(jQuery);

// export current sheet to a JSON file for user to download
function exportSheet() 
{ 
  let customParse = function(val, inputName) 
  {
    if (val === "")    return null; // parse empty strings as nulls
    if (val === "on")  return true; // parse "on" (from checkboxes) as true
    return val;
  }

  let filename = $("#filename").val();
  var obj = $("#sheet").serializeJSON(
    {
      checkboxUncheckedValue  : 'false',
      parseAll                : true,
      parseWithFunction       : customParse
    }
  );

  let data = "text/json;charset=utf-8," 
           + encodeURIComponent(JSON.stringify(obj, null, 2));

  let a = $("#export-sheet")[0];
  a.href         = 'data:' + data;
  a.download     = filename + '.json';
  document.title = filename;

  dirtyForm = false;
}

// import a JSON sheet uploaded by user
function importSheet() 
{ 
  let uploader = $("#sheet-file");
  uploader.unbind("change"); // avoid double call to reader

  uploader.trigger("click");
  uploader.bind("change", function () 
  {
    let sheetFile = uploader[0].files[0];
    uploader.val("");
    let reader = new FileReader();
    reader.onload = function() 
    {
      let sheetData;
      try {
        sheetData = JSON.parse(reader.result);
      } 
      catch (error) 
      {
        return alert("RPG Sheet was not able to import your sheet because of the following error:\n\n" + error);
      }
      let sheetName = sheetData.meta['sheet'];
      newSheet(sheetName, sheetData);
    }
    reader.readAsText(sheetFile);
  });
}

// load a given sheet, deserialize data if given
function newSheet(sheetName, sheetData) { 
  let sheetDir    = "sheets/" + sheetName + "/";
  let sheetCss    = sheetDir + "style.css";
  let sheetMain   = sheetDir + "main.html";
  let sheetFooter = sheetDir + "footer.html";

  $("main").load(sheetMain, function(response, status, xhr) 
    {
      if (status == "error") 
      {
        alert("The sheet module you are attempting to load is not supported by this instance of RPG Sheet.\n\nEither the sheet module is not installed or you are importing a sheet with bad meta values.");
        return;
      }

      $("#sheet-css")[0].href = sheetCss;
      $("footer").load(sheetFooter);

      if (sheetData) 
      {
        let sheetDataVersion = sheetData.meta['version'];
        let sheetVersion = parseInt($("input[name=meta\\[version\\]]").val());

        if (sheetDataVersion < sheetVersion) 
        {
          alert("The version of the sheet that you are importing is older than the current version of this module. There may be some incomplete or missing data.\n\nExporting will update your sheet to the current version.");
        } 
        else if (sheetDataVersion > sheetVersion) 
        {
          alert("The version of the sheet that you are importing is newer than the current version of this module. There may be some incomplete or missing data.\n\nExporting will overwrite your sheet with the older version.");
        }

        $("#sheet").deserializeJSON(sheetData);
        
        // set the sheet version back to what it was before deserializing data
        $("input[name=meta\\[version\\]]").val(sheetVersion);
        document.title = $("#filename").val();
        // There is no DOM event to indicate that elements have fully rendered CSS
        // changes. Use a timeout to attempt to queue sizing input text until
        // after the changes are rendered.
        setTimeout(function() 
          {
            $("input[type=text]").each(autoSizeInput);
          },
          0
        );
      };

      dirtyForm=false;
      //super simple change event on every form input
      $("form :input").change(function() { dirtyForm=true; });
      $("figure").on("click", promptImage);
      setImages();
      getSheetOptions();
    }
  );
}

// confirm if user tries to import over a dirty form
function importCheckFirst()
{ 
  if (dirtyForm) 
  {
    let result = window.confirm(
      "Some data may be overwritten by an import. Continue?"
    );
    if (result) 
    {
      importSheet();
    }
  } 
  else 
  {
    importSheet();
  }
}

// prompt user for image url for given figure
function promptImage(e) 
{ 
  let current = $(this).children("input").val();
  let url     = window.prompt("Enter an image URL.", current);

  if (url === null || url === current) 
  {
    return false;
  }

  $(this).children("input").val(url);
  setImages();
}

// take the image urls in figure inputs and load them in associated img tags
function setImages() 
{ 
  $("figure input").each(function(i, obj)
    {
      let url = $(obj).val();
      $(obj).next("img").attr("src", url);
    }
  );
}

// auto adjusts size of user input to fit field
function autoSizeInput(event) 
{ 
  // fetch all initial size values
  let textHeight       = parseInt($(this).css('font-size'), 10);
  let scrollHeight     = this.scrollHeight;
  let scrollWidth      = this.scrollWidth;
  let fieldCssHeight   = parseInt($(this).css('height'), 10);
  let fieldCssWidth    = parseInt($(this).css('width'), 10);
  let fieldInnerHeight = $(this).innerHeight();
  let fieldInnerWidth  = $(this).innerWidth();

  // only re-adjust if text is too short, too tall, or too wide
  if (textHeight != fieldCssHeight || scrollHeight > fieldInnerHeight 
   || scrollWidth > fieldInnerWidth )
  {
    // set baseline size to field height
    $(this).css('font-size', fieldCssHeight);

    // fetch updated text sizes
    let updatedTextHeight   = parseInt($(this).css('font-size'), 10);
    let updatedScrollHeight = this.scrollHeight;
    let updatedScrollWidth  = this.scrollWidth;
    // if text is too tall after baseline, calculate a new font size
    if (updatedScrollHeight > fieldInnerHeight)
    {
      let variance  = updatedScrollHeight - fieldCssHeight
      let newHeight = updatedTextHeight - variance;
      $(this).css('font-size', newHeight + 'px');
    }

    // fetch updated sizes, yet one more time
    updatedTextHeight   = parseInt($(this).css('font-size'), 10);
    updatedScrollHeight = this.scrollHeight;
    updatedScrollWidth  = this.scrollWidth;

    // if the text is still too wide, calculate a new font size
    if (updatedScrollWidth > fieldInnerWidth)
    {
      let ratio     = updatedTextHeight / updatedScrollWidth;
      let newHeight = fieldCssWidth * ratio;
      $(this).css('font-size', newHeight + 'px');
    }
  }
}

// warn users of browser incompatability
function browserCheck() 
{ 
  if (document.cookie.indexOf("browser_check") < 0) 
  {
    // http://stackoverflow.com/a/9851769
    let isOpera = (!!window.opr && !!opr.addons) || !!window.opera 
      || navigator.userAgent.indexOf(' OPR/') >= 0;
    var isFirefox = typeof InstallTrigger !== 'undefined';
    var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
    var isIE = /*@cc_on!@*/false || !!document.documentMode;
    var isEdge = !isIE && !!window.StyleMedia;
    var isChrome = !!window.chrome && !!window.chrome.webstore;
    var isBlink = (isChrome || isOpera) && !!window.CSS;

    if (isFirefox || isIE || isEdge)
    {
      alert("RPG Sheet has only been tested in Chrome/Chromium. It is very likely to be broken in your browser. \n\nHere be dragons.");
    } 
    else if (isOpera || isSafari)
    {
      alert("RPG Sheet has only been tested in Chrome/Chromium. While it should work in most WebKit browsers, there are likely to be some bugs.\n\nHere be dragons.");
    }

    document.cookie="browser_check=true"
  }
}

// check #sheet-main for known data- attributes to set options for sheets
function getSheetOptions() { 
  let options = $("#sheet-main");
  if (options.data("exportable")) 
  {
    $(".export-control").css("display", "list-item");
  }
}

$("#import-sheet").on("click", importCheckFirst);
$("#export-sheet").on("click", exportSheet);
$(".title").on("click", function(){ location.reload(true); });
$("main").on("keyup", 'input[type=text]', autoSizeInput);
window.onbeforeunload = function()
  {if (dirtyForm) return 'Some changes have not been exported.'};
window.onload = function(){ newSheet("home"); browserCheck(); };
// vim: set fdn=1 :
