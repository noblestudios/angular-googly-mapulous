  /////////////////////////////////////////////////////////////////////////////
  // Utility functions ////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Given a center lat/lng and a width and height of a rectangle, return
   * google LatLngBounds object for the rectangle.
   *
   * @param {Float} lat Latitude of rectangle center
   * @param {Float} lng Longitude of rectangle center
   * @param {Integer} width Width of rectangle in meters
   * @param {Integer} height Height of rectangle in meters
   * @return {Object} Returns compiled LatLngBounds object
   **/
  function getRectangleBounds ( lat, lng, width, height ) {
    // First figure out correct angle for calculating lat/lng offset of corners
    var distance = Math.sqrt( Math.pow( width, 2 ) + Math.pow( height, 2 ) );
    var angleOffset = Math.acos(
      ( Math.pow( ( distance / 2 ) , 2 ) + Math.pow( ( height / 2 ), 2 ) - Math.pow( ( width / 2 ), 2 ) ) /
      ( 2 * ( height / 2 ) * ( distance / 2 ) ) ) *
      ( 180 / Math.PI );

    // Then calculate the lat/lng of the bounding corners (SW and NE corners)
    var southwest = google.maps.geometry.spherical.computeOffset(
      new google.maps.LatLng( lat, lng ),
      ( distance / 2 ),
      180 + angleOffset
    );
    var northeast = google.maps.geometry.spherical.computeOffset(
      new google.maps.LatLng( lat, lng ),
      ( distance / 2 ),
      angleOffset
    );

    // Now put together actual bounds object and back we go
    return new google.maps.LatLngBounds( southwest, northeast );
  }

  /**
   * Debounce a passed function (ensures that multiple events will not trigger
   * event function until timeout has passed).
   * Modified from Underscore.js - http://underscorejs.org/#debounce
   *
   * @param {Function}  func      Function to debounce
   * @param {Integer}   wait      Time period to wait before firing debounced
   * function
   * @param {Boolean}   immediate Set true to immediately fire debounced
   * function THEN wait specified period
   * @return {Function}           Returns debounced function
   **/
  function debounce ( func, wait, immediate ) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = Date.now() - timestamp;
      if ( last < wait ) {
        timeout = setTimeout( later, wait - last );
      } else {
        timeout = null;
        if ( ! immediate ) {
          result = func.apply( context, args );
          context = args = null;
        }
      }
    };

    return function () {
      context = this;
      args = arguments;
      timestamp = Date.now();
      var callNow = immediate && ! timeout;
      if ( ! timeout ) {
        timeout = setTimeout( later, wait );
      }
      if ( callNow ) {
        result = func.apply( context, args );
        context = args = null;
      }

      return result;
    };
  }
