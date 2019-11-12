var createLassoBrush = function(pointDef) {

  var brush = {
    key: 'lasso',
    type: 'brush-lasso',
    settings: {
      brush: {
        components: [
          {
            key: pointDef,
            contexts: ['lasso']
          }
        ]
      }
    }
  };

  return brush;
}

export default createLassoBrush
