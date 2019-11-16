var scaleFieldArray = function(scale, array, level, max){
  var field = 'scalefield';
  if(level > 1) field = field + level;
  if(scale[field] != "" && (typeof scale[field] != 'undefined')){
    array.push(scale[field]);
    if(level < max){
      return scaleFieldArray(scale, array,level+1,max);
    }
  }
  return array;
};


//Create Scales
var createScales = function(scalesDef) {
  var scalesObj = {};

  scalesDef.forEach((scale) => {

    var fields = [];
    scaleFieldArray(scale,fields,1,3);

    var scalefieldType = scale.scalefield.split("/");

    if (scalefieldType[0] == "qDimensionInfo") {

      var extract = {};
      if(fields.length == 1){
        extract.field = fields[0];
      }else{
        extract.fields = fields;
      }

      scalesObj[scale.scalename] = {
        data: {
          extract
        },
        invert: scale.scaleinvert,
        padding: scale.scalepadding
      };


    } else {

      var data = {};
      if(fields.length == 1){
        data.field = fields[0];
      }else{
        data.fields = fields;
      }

      scalesObj[scale.scalename] = {
        data,
        invert: scale.scaleinvert,
        expand: scale.scaleexpand,
      };

      if (typeof scale.scaleinclude != 'undefined' && scale.scaleinclude != '') {
        scalesObj[scale.scalename].include = scale.scaleinclude.split(",");
      }
    }
    if (scale.scaletype != "") {
      scalesObj[scale.scalename].type = scale.scaletype;
    }

    if(scale.scaletype == "threshold-color"){
      scalesObj[scale.scalename].domain = scale.colordomain.split(";").map(x => parseInt(x));
      scalesObj[scale.scalename].range = scale.colorrange.split(";");
      delete scalesObj[scale.scalename].data;
    }

    if(scale.scaletype == "categorical-color"){
      var isDomainColors = (scale.colordomain && scale.colordomain.length > 0 && scale.colordomain.split(";").length > 0);
      if (isDomainColors) {
        scalesObj[scale.scalename].domain = scale.colordomain.split(";");
      }
      scalesObj[scale.scalename].range = scale.colorrange.split(";");

      // if color field 2nd+ dimension we need to sort
      if (scalefieldType[1] !== "0") {
        scalesObj[scale.scalename].data.sort = (a, b) => a.label > b.label ? 1 : -1;
      }
    }
    console.log(scalesObj);
    //console.log(scalesObj[scale.scalename]);

  });
  return scalesObj;
};

export default createScales;
