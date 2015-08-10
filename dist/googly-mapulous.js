/**
 * The Module
 *
 * Contains two major components - a directive (googleMap) and a service
 * (googleMaps).  The directive uses the service to construct a simple map
 * which can then be referenced in the enclosing $scope.  The service can be
 * used outside of the directive anywhere maps functionality is needed.
 **/
angular.module( 'googlyMapulous', [] );

/**
 * The Directive
 *
 * This builds a simple google map.  The map functionality can be easily
 * extended to handle markers, clustering, overlays, etc.  Note that this
 * directive requires the accompanying service.  The service can also be used
 * to create google map functionality in any context.
 **/
angular.module( 'googlyMapulous' ).directive( 'googleMap', [ 'googleMaps', function ( googleMaps ) {
  return {
    restrict: 'E',
    template: '<div class="google-map-container"><div class="google-map"></div></div>',
    controller: [ '$scope', '$element', '$compile', '$attrs', function ( $scope, $element, $compile, $attrs ) {
      // Check for presence of manual init var in $scope.  Wait for manual call
      // before initting if set, otherwise create the map immediately
      if ( $scope.mapManualInit || typeof( $attrs.manualInit ) !== 'undefined' ) {
        var unsubscribe = $scope.$on( 'initializeGoogleMap', function () {
          initMap();

          unsubscribe();
        });
      } else {
        initMap();
      }

      /////////////////////////////////////////////////////////////////////////////
      // Internal functions ///////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////////////////////////

      /**
       * Load the map (create the actual google map object).  Fire loaded event
       * when finished.
       */
      function initMap () {
        // Set basic map config up
        // These can be overridden by config options contained in
        // $scope.mapConfig
        var options = {};
        if ( $scope.mapConfig && $scope.mapConfig instanceof Object ) {
          Object.keys( $scope.mapConfig ).forEach( function ( key ) {
            options[ key ] = $scope.mapConfig[ key ];
          });
        }

        // Build the map and save a reference to the created map object in the
        // $scope for reference later from controller
        $scope.googleMap = new googleMaps.GoogleMap( $element[ 0 ].children[ 0 ].children[ 0 ], $scope, $compile, options );

        // Fire event at the point so the outer control knows we're done
        $scope.$emit( 'googleMapLoaded', $scope.googleMap );

        // Also set a scope variable for checking map loaded status
        $scope.mapLoaded = true;
      }
    }]
  };
}]);

 /**
 * The Service
 *
 * This service provides access to wrapper objects for Google Maps
 * functionality.  This is used in the directive but can also be used to build
 * Google Maps wherever needed.
 **/
angular.module( 'googlyMapulous' ).provider( 'googleMaps', [ function () {

  /////////////////////////////////////////////////////////////////////////////
  // Classes/functions ////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////////
  // Map object ///////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////


  /**
   * Main map constructor.  Will return constructed GoogleMap object for
   * reference later on as needed.
   *
   * @param {Object} element  HTML node to attach map to
   * @param {Object} $scope   Scope object from desired controller
   * @param {OBject} $compile $compile service from Angular controller
   * @param {Object} options  Additional options to pass into map constructor
   * (optional)
   * @param {Array}  markers  Array of Marker objects to immediately add to map
   * (optional)
   **/
  var GoogleMap = function ( element, $scope, $compile, options, markers ) {
    if ( google && google.maps && element && $scope ) {
      // Make sure this has a unique copy of the state object
      this.state = JSON.parse(JSON.stringify( this.state ));

      // Build default options
      var mapOptions = JSON.parse(JSON.stringify( this.config.defaultMapOptions ));

      mapOptions.center = new google.maps.LatLng(
        mapOptions.center.lat,
        mapOptions.center.lng
      );

      // Then roll in config options if they were passed
      if ( options && options instanceof Object ) {
        Object.keys( options ).forEach( function ( key ) {
          mapOptions[ key ] = options[ key ];
        });
      }

      // Create the map
      this.state.map = new google.maps.Map( element, mapOptions );

      // And bind internal event listeners
      this.bindInternalEvents();

      // Save a few internal things
      this.state.$scope   = $scope;
      this.state.$compile = $compile;

      // And now construction is finished, add any passed Markers to the map
      if ( markers && markers.length ) { this.addMarkers( markers ); }

      // And back we go
      return this;
    } else {
      // Throw error checking for load issues
      this.errors.init( element, $scope, $compile );
    }

    // Something didn't go right
    return null;
  };

  /**
   * Retrieve the physical google map object.  Useful if you really want to get
   * your hands dirty.
   *
   * @return {Object} Returns google map object
   **/
  GoogleMap.prototype.getMap = function () {
    return this.state.map;
  };

  /**
   * Add constructed Marker object(s) to the Map.
   *
   * @param {Mixed} marker Constructed Marker object or array of Markers
   **/
  GoogleMap.prototype.addMarkers = function ( markers ) {
    if ( markers ) {
      if ( ! ( markers instanceof Array ) ) { markers = [ markers ]; }

      if ( markers.length ) {
        markers.forEach( ( function ( marker ) {
          // Add to physical map
          marker.addToMap( this );

          // And update bookkeeping if necessary
          if ( this.state.markers.indexOf( marker ) === -1 ) {
            this.state.markers.push( marker );
          }
        }).bind( this ));
      }
    } else {
      console.error( 'Invalid Marker object/array passed to GoogleMap.addMarkers' );
    }
  };

  /**
   * Clear all markers in the map instance (cluster or singles).
   **/
  GoogleMap.prototype.clearMarkers = function ( event, callback ) {
    if ( this.state.markers && this.state.markers.length ) {
      this.state.markers.forEach( function ( marker ) {
        marker.remove();

        // Make sure the marker itself is dead
        delete marker;
      });

      // Clear the markers array before leaving
      this.state.markers = [];
    }
  };

  /**
   * Remove marker(s) from the map as well as the internal list of Markers.
   * clearMarkers should be called instead if the intentional is to erase
   * all markers at once.
   *
   * @param {Mixed} marker Constructed Marker object or array of Markers
   **/
  GoogleMap.prototype.removeMarkers = function ( markers ) {
    if ( markers ) {
      if ( ! ( markers instanceof Array ) ) { markers = [ markers ]; }

      if ( markers.length ) {
        markers.forEach( (function ( marker ) {
          this.removeMarker( marker );
        }).bind( this ));
      }
    } else {
      console.error( 'Invalid array of Markers passed to GoogleMap.removeMarkers' );
    }
  };

  /**
   * Remove a single marker from the map.  The above is a convenience method
   * for handling single/multiple markers at once.
   *
   * @param  {Object} marker Constructed Marker object
   * @return {Boolean}       Returns true/false on successful marker removal
   **/
  GoogleMap.prototype.removeMarker = function ( marker ) {
    if ( marker ) {
      for ( var i = this.state.markers.length; i > 0; i-- ) {
        if ( this.state.markers[ i ] === marker ) {
          // Remove from the map
          marker.remove();

          // Kill the object
          delete marker;

          // And update the internal array
          this.state.markers.splice( i, 1 );

          return true;
        }
      }
    } else {
      console.error( 'Invalid Marker object passed to GoogleMap.removeMarker' );
    }

    // Something went wrong apparently
    return false;
  };

  /**
   * Get all markers currently in the GoogleMap objects (note this doesn't mean
   * they are all being actively displayed).
   *
   * @return {Array} Returns array of Marker objects or empty array if there
   * are none
   **/
  GoogleMap.prototype.getMarkers = function () {
    return this.state.markers;
  };

  /**
   * Show all hidden markers again (will not work if markers were deleted).
   **/
  GoogleMap.prototype.showMarkers = function ( event, callback ) {
    if ( this.state.markers && this.state.markers.length ) {
      this.state.markers.forEach( function ( marker ) {
        marker.show();
      });
    }
  };

  /**
   * Hide all markers in the map instance (cluster or singles). This will turn
   * the markers off without deleting them.
   **/
  GoogleMap.prototype.hideMarkers = function ( event, callback ) {
    if ( this.state.markers && this.state.markers.length ) {
      this.state.markers.forEach( function ( marker ) {
        marker.hide();
      });
    }
  };

  /**
   * Add a polygon overlay to the map based on passed points.  Takes default
   * arguments for stroke and fill or custom args can also be rolled in.
   *
   * @param  {Array}   points        Array of lat/lng objects
   * @param  {String}  strokeColor   Color of outline (optional)
   * @param  {Float}   strokeOpacity Opacity of outline (optional)
   * @param  {Integer} strokeWeight  Width of outline, in pixels (optional)
   * @param  {String}  fillColor     Color of polygon fill (optional)
   * @param  {Float}   fillOpacity   Opacity of fill (optional)
   * @param  {Object}  options       Object of additional properties (optional)
   * @return {Object}                Returns the created map overlay object
   **/
  GoogleMap.prototype.addPolygonOverlay = function ( points, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity, options ) {
    if ( points && points.length ) {
      // Build array of LatLng objects from passed points
      var paths = [];

      points.forEach( function ( latLng ) {
        paths.push( new google.maps.LatLng( latLng.lat, latLng.lng ) );
      });

      // Set basic properties
      var polygonOptions = {
        paths: paths,
        strokeColor: strokeColor,
        strokeOpacity: strokeOpacity,
        strokeWeight: strokeWeight,
        fillColor: fillColor,
        fillOpacity: fillOpacity
      };

      // Roll in other options
      if ( options && options instanceof Object ) {
        Object.keys( options ).forEach( function ( key ) {
          polygonOptions[ key ] = options[ key ];
        });
      }

      // And build the overlay
      var overlay = new google.maps.Polygon( polygonOptions );

      // Assign the overlay to the map
      overlay.setMap( this.state.map );

      // Save internal reference to the overlay
      this.state.overlays.push( overlay );

      return overlay;
    } else {
      console.error( 'Array of lat/lng objects must be passed to GoogleMap.addPolygonOverlay' );
    }

    return null;
  };

  /**
   * Add ground overlay image.  This is centered by lat/lng and positioned
   * based on desired width and height of coverage in meters (i.e. a geometric
   * square on the ground).  Requires the Geometry library.
   *
   * @param  {String} imageUrl  URL to image for overlay
   * @param  {Float}  centerLat Center latitude
   * @param  {Float}  centerLng Center longitude
   * @param  {Int}    width     Desired width of overlay (in meters)
   * @param  {Int}    height    Desired height of overlay (in meters)
   * @param  {Float}  opacity   Overlay opacity (optional)
   * @return {Object}           Returns the created map overlay object
   **/
  GoogleMap.prototype.addGroundOverlay = function ( imageUrl, centerLat, centerLng, width, height, opacity ) {
    if ( google.maps.geometry && imageUrl && centerLat && centerLng && width && height ) {
      // Calculate correct bounds for image placement
      var bounds = getRectangleBounds( centerLat, centerLng, width, height );

      // Fold in options if passed
      var overlayOptions = {
        clickable: true,
        opacity: opacity
      };

      // Then build the overlay
      var overlay = new google.maps.GroundOverlay( imageUrl, bounds, overlayOptions );

      // Assign the overlay to the map
      overlay.setMap( this.state.map );

      // Save internal reference to the overlay
      this.state.overlays.push( overlay );

      return overlay;
    } else {
      this.errors.groundOverlay( imageUrl, centerLat, centerLng, width, height );
    }

    return null;
  };

  /**
   * Center the map, immediately or with pan.
   *
   * @param {Float}   lat
   * @param {Float}   lng
   * @param {Boolean} pan Set to true for pan effect
   **/
  GoogleMap.prototype.center = function ( lat, lng, pan ) {
    pan = pan || false;

    if ( lat && lng && this.state.map ) {
      if ( pan ) {
        this.state.map.panTo( new google.maps.LatLng( lat, lng ) );
      } else {
        this.state.map.setCenter( new google.maps.LatLng( lat, lng ) );
      }
    } else {
      this.errors.center( lat, lng );
    }
  };

  /**
   * Zoom the map.
   *
   * @param {Integer} zoom Zoom level.  Valid values are 0 (all the way out) to
   * 21 (all the way in)
   **/
  GoogleMap.prototype.zoom = function ( zoom ) {
    if ( this.state.map && zoom && zoom >= 0 && zoom <= 22 ) {
      this.state.map.setZoom( zoom );
    } else {
      this.errors.zoom( zoom );
    }
  }

  /**
   * Close infoboxes for all current markers contained in the map.
   **/
  GoogleMap.prototype.closeInfoboxes = function () {
    if ( this.state.markers && this.state.markers.length ) {
      this.state.markers.forEach( function ( marker ) {
        marker.closeInfobox();
      });
    }
  };

  /**
   * Fit bounds to markers.  Will fit to passed marker array or to internal
   * marker list if no markers are passed.
   *
   * @param {Array} markers Markers to fit bounds to
   **/
  GoogleMap.prototype.fitBounds = function ( markers ) {
    markers = markers || this.state.markers;

    if ( markers && markers.length ) {
      // First get the set of visible markers - no sense fitting bounds to a set
      // of invisible markers
      var visibleMarkers = markers.filter( function ( marker ) {
        return marker.isVisible();
      });

      if ( visibleMarkers.length ) {
        // Set dirty flag while fitting bounds so zoom events
        // don't fire
        this.state.fittingBounds = true;

        var bounds = new google.maps.LatLngBounds();
        markers.forEach( function ( marker ) {
          if ( marker.isVisible() ) {
            bounds.extend( marker.state.marker.getPosition() );
          }
        });

        this.state.map.fitBounds( bounds );
      }
    }
  };

  /**
   * Add event to the map instance.
   *
   * @param {String}   event    Google Maps event to tie into.
   * @param {Function} callback Callback function for event trigger
   **/
  GoogleMap.prototype.addEvent = function ( event, callback ) {
    google.maps.event.addListener( this.state.map, event, callback );
  };

  /**
   * Internal events (event used for internal functionality rather than external
   * events for user-specified functionality).
   **/
  GoogleMap.prototype.bindInternalEvents = function () {
    // Set up bounds event so we can set a flag when bounds are changing
    // so as not to thrash the zoom event (which fires when bounds change)
    google.maps.event.addListener( this.state.map, 'bounds_changed', ( function ( event ) {
      this.fittingBounds = false;
    }).bind( this ));

    // On zoom event, close all infoboxes in the map unless the map is fitting
    // bounds (this fires a zoom event)
    google.maps.event.addListener( this.state.map, 'zoom_changed', debounce(( function ( event ) {
      if ( ! this.fittingBounds ) {
        this.closeInfoboxes();
      }
    }).bind( this ), 150 ));
  };

  /**
   * Compile the passed markup using the map object's $scope/$compiler.
   *
   * @param {String}  content Markup to compile
   * @param {Mixed}   scopeData Data to be passed to the compiled controller
   * via the transclude API.  Any data passed here will be available in the
   * created controller object by calling $transclude( $scope ) after
   * controller creation.
   * @return {Object}         Returns compiled markup, ready for use
   **/
  GoogleMap.prototype.compile = function ( content, scopeData ) {
    if ( content && this.state.$scope && this.state.$compile ) {
      var compiler = this.state.$compile( content, function ( scope ) {
        if ( scopeData ) { scope.mapData = scopeData; }
      });

      return compiler( this.state.$scope );
    } else {
      this.errors.compile( content );
    }
  };

  /**
   * Returns true if map currently has Markers assigned to it.
   *
   * @return {Boolean} Returns true if map has Markers
   */
  GoogleMap.prototype.hasMarkers = function () {
    return ( this.state.markers && this.state.markers.length )
      ? true
      : false;
  };

  /**
   * Returns true if map currently has Clusters assigned to it.
   *
   * @return {Boolean} Returns true if map has Clusters
   */
  GoogleMap.prototype.hasClusters = function () {
    return ( this.state.clusters && this.state.clusters.length )
      ? true
      : false;
  };

  /**
   * Returns true if map currently has overlays assigned to it.
   *
   * @return {Boolean} Returns true if map has overlays
   */
  GoogleMap.prototype.hasOverlays = function () {
    return ( this.state.overlays && this.state.overlays.length )
      ? true
      : false;
  };

  /**
   * Returns true if map is loaded (has a google map object).
   *
   * @return {Boolean} Returns true if map is loaded
   */
  GoogleMap.prototype.isLoaded = function () {
    return this.state.map
      ? true
      : false;
  };

  /**
   * Map-wide config options.
   **/
  GoogleMap.prototype.config = {
    defaultMapOptions: {
      center: { lat: 39.5579311, lng: -119.8508414 },
      zoom: 8,
      disableDefaultUI: false,
      styles: []
    }
  };

  /**
   * Map-wide state.
   **/
  GoogleMap.prototype.state = {
    map: null,
    markers: [],
    clusters: [],
    overlays: [],
    $scope: null,
    $compile: null,

    // Will be set to true if the map is currently fitting bounds
    // (this keeps zoom events from firing until it's done)
    fittingBounds: false
  };

  /**
   * Error handling.
   **/
  GoogleMap.prototype.errors = {
    init: function ( element, $scope, $compile ) {
      if (
        typeof( google ) === 'undefined' ||
        typeof( google.maps ) === 'undefined'
      ) {
        console.error( 'Google Maps API not loaded.  Example include URL: //maps.googleapis.com/maps/api/js?key=key&sensor=false&libraries=geometry' );
      }
      if ( ! element ) {
        console.error( 'Valid HTML element to attach map to must be passed to map constructor' );
      }
      if ( ! $scope ) {
        console.error( 'Valid $scope object must be passed to map constructor' );
      }
      if ( ! $compile ) {
        console.error( '$compile service must be passed to allow infobox content to be rendered properly' );
      }
    },
    compile: function ( content ) {
      if ( ! this.state.$scope ) {
        console.error( 'Angular $scope must be set to use compile service.' );
      }
      if ( ! this.state.$compile ) {
        console.error( 'Angular $compile service must be set to use compile service.' );
      }
      if ( ! content ) {
        console.error( 'Valid content string must be passed to compile service.' );
      }
    },
    groundOverlay: function ( imageUrl, centerLat, centerLng, width, height ) {
      if ( ! google.maps.geometry ) {
        console.error( 'Geometry library for Google Maps API not loaded.  Clustering will not be available.  Example include URL: //maps.googleapis.com/maps/api/js?key=key&sensor=false&libraries=geometry' );
      }
      if ( ! centerLat || ! centerLng ) {
        console.error( 'Valid center lat/lng must be passed to GoogleMap.addGroundOverlay' );
      }
      if ( ! width || ! height ) {
        console.error( 'Valid width height in meters must be passed to GoogleMap.addGroundOverlay' );
      }
    },
    center: function ( lat, lng ) {
      if ( ! this.state.map ) {
        console.error( 'Google Map must be active before attempting to center the map' );
      }
      if ( ! lat || ! lng ) {
        console.error( 'Valid lat/lng must be passed to center map' );
      }
    },
    zoom: function ( zoom ) {
      if ( ! this.state.map ) {
        console.error( 'Google Map must be active before attempting to zoom the map' );
      }
      if ( ! zoom ) {
        console.error( 'Valid zoom must be passed to zoom the map' );
      }
      if ( zoom < 0 || zoom > 21 ) {
        console.error( 'Passed zoom value falls outside of acceptable zoom range (0 - 21)' );
      }
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // Marker object ////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////


  /**
   * Create a new marker in the specified map with the specified properties.
   * Note that this will only create the base Marker - other things, such as
   * event handlers/clustering/infoboxes need to be attached separately.
   *
   * @param  {Float}   lat     Marker latitude
   * @param  {Float}   lng     Marker longitude
   * @param  {Object}  map     GoogleMap object to attach Marker (optional).
   * If passed, Marker will be attached to the specified map immediately.
   * @param  {String}  icon    Marker icon (png or svg, optional).  Default icon
   * will be used if this is not passed.
   * @param  {Integer} width   Marker width (optional)
   * @param  {Integer} height  Marker height (optional)
   * @param  {Object}  options Custom options to pass with Marker constructor
   * (optional)
   * @param  {String}  label   Text or HTML to use as marker label (optional)
   * @param  {Mixed}   data    Additional data to save with Marker object
   * @return {Object}          Returns constructed Marker object
   **/
  var Marker = function ( lat, lng, map, icon, width, height, options, label, data ) {
    if ( google && google.maps && lat && lng ) {
      // Make sure this has a unique copy of the state object
      this.state = JSON.parse(JSON.stringify( this.state ));

      // Pull in default config options
      var markerOptions = JSON.parse(JSON.stringify( this.config.defaultMarkerOptions ));

      markerOptions.position = new google.maps.LatLng( lat, lng );

      // Then roll in config options if they were passed
      if ( options && options instanceof Object ) {
        Object.keys( options ).forEach( function ( key ) {
          markerOptions[ key ] = options[ key ];
        });
      }

      // Build custom icon (otherwise default icon will be used)
      if ( icon ) {
        var markerIcon = {
          url: icon,
          size: ( width && height )
            ? new google.maps.Size( width, height )
            : new google.maps.Size( 32, 32 ),
          scaledSize: ( width && height )
            ? new google.maps.Size( width, height )
            : new google.maps.Size( 32, 32 ),
          origin: new google.maps.Point( 0, 0 ),
          anchor: ( width && height )
            ? new google.maps.Point( width / 2, height )
            : new google.maps.Point( 16, 32 )
        };

        markerOptions.icon = markerIcon;
      }

      // And in label content if passed
      if ( label ) { markerOptions.labelContent = label; }

      // And build the basic marker
      if ( label ) {
        // Build MarkerWithLabel if label was passed
        this.state.marker = new MarkerWithLabel( markerOptions );
      } else {
        // Otherwise, just build vanilla Marker
        this.state.marker = new google.maps.Marker( markerOptions );
      }

      // Save reference to passed marker data both here and in the marker
      // itself
      if ( data ) { this.state.data = this.state.marker.data = data; }

      // If map was passed, immediately add this marker to the map
      if ( map ) {
        this.state.map = map;
        map.addMarkers( this );
      }

      // And back we go
      return this;
    } else {
      this.errors.init( lat, lng, map, icon, width, height, options, data );
    }

    // Something didn't go right
    return null;
  };

  /**
   * Retrieve the physical google map marker.  Useful if you really want to get
   * your hands dirty.
   *
   * @return {Object} Returns google marker object
   **/
  Marker.prototype.getMarker = function () {
    return this.state.marker;
  };

  /**
   * Create new InfoBox and link it to the Marker.  Note that this only creates
   * the infobox - it still has to be tied to a separate event to be used. Note
   * that no params are required here, but oftentimes you won't set any infobox
   * options/content until the box is actually used.
   *
   * @param {String}  content    Infobox content - can be HTML (optional)
   * @param {String}  closeIcon  Path to close icon to use for infobox (optional)
   * @param {String}  boxClass   Custom container class to apply to infobox
   * (optional)
   * @param {Object}  offset     Object containing x and y offset coordinates from
   * infobox marker (optional)
   * @param {Object}  options    Additional custom options to pass into InfoBox
   * constructor
   * @param {String}  openOn     Event to open infobox on.  Can be either 'hover'
   * or 'click.'  Defaults to hover.
   * @param {Boolean} scrollable Whether content should be scrollable or not
   * (requires JScrollPane)
   * @param {Mixed} closeTimeout If defined, will automatically close infobox
   * after the passed timeout in milliseconds
   **/
  Marker.prototype.addInfobox = function ( content, closeIcon, boxClass, offset, options, openOn, scrollable, closeTimeout ) {
    // Set up vanilla options
    var infoboxOptions = {
      closeBoxURL: closeIcon ? closeIcon : null,
      boxClass: boxClass ? boxClass : 'infobox',
      pixelOffset: offset
        ? new google.maps.Size( offset.x, offset.y )
        : new google.maps.Size( 0, 0 ),
      alignBottom: true
    };

    // Roll in any other custom options if passed
    if ( options && options instanceof Object ) {
      Object.keys( options ).forEach( function ( key ) {
        infoboxOptions[ key ] = options[ key ];
      });
    }

    // Deal with the content.  To ensure Angular bindings still work, we're
    // going to create a simple container class, then append compiled Angular
    // content to the container AFTER the infobox renders.
    infoboxOptions.content = '<div class="infobox-container"></div>';

    // If infobox should be scrollable, check for JSP and if so, wrap content
    // appropriately
    if ( scrollable ) {
      if ( jQuery.fn.jScrollPane ) {
        var classes = infoboxOptions.boxClass + ' is-scrollable';
        content = '<div class="' + classes + '">' + content + '</div>';
      } else {
        this.errors.jscrollpane();
      }
    }

    // Now everything else is dealt with, compile the passed content.  It will
    // actually be used once the infobox is rendered.
    this.state.infoboxContent = this.state.map.compile( content, this.state.data );

    // Create the actual InfoBox
    this.state.infobox = new InfoBox( infoboxOptions );

    // Tie in infobox open events
    if ( ! openOn || openOn === 'hover' ) {
      this.addEvent( 'mouseover', (function () {
        // Close all open infoboxes
        this.state.map.closeInfoboxes();

        // And open this infobox
        this.openInfobox();
      }).bind( this ));
    } else if ( openOn === 'click' ) {
      this.addEvent( 'click', (function () {
        // Close all open infoboxes
        this.state.map.closeInfoboxes();

        // And open this infobox
        this.openInfobox();
      }).bind( this ));
    }

    // Tie in post-render infobox events
    google.maps.event.addDomListener( this.state.infobox, 'domready', (function () {
      var infobox = this.state.infobox;

      if ( infobox.getContent() ) {
        // Infobox is rendered, attach the actual compiled content so Angular
        // content works
        var container = infobox.div_.getElementsByClassName( 'infobox-container' )[ 0 ];
        container.appendChild( this.state.infoboxContent[ 0 ] );

        // Set up close timeout on rendered infobox element if necessary
        if ( closeTimeout ) {
          infobox.div_.addEventListener( 'mouseenter', function () {
            if ( typeof( infobox.closeTimer ) == 'number' ) {
                clearTimeout( infobox.closeTimer );
            }
          });

          infobox.div_.addEventListener( 'mouseleave', function () {
            infobox.closeTimer = setTimeout( function () {
                infobox.close();
            }, closeTimeout );
          });
        }

        // If infobox is scrollable, set up JScrollPane (requires
        // jQuery/JScrollPane).  This also ensures scroll/drag events in the
        // scroll container work as expected.
        if ( scrollable ) {
          jQuery( container ).jScrollPane().bind( 'mouseup.jsp', function () {
              jQuery('html').unbind( 'dragstart.jsp selectstart.jsp mousemove.jsp mouseup.jsp mouseleave.jsp' );

              jQuery('.jspActive').removeClass( 'jspActive' );
          });
        }
      }
    }).bind( this ));
  };

  /**
   * Add the marker object to the specified map.
   *
   * @param {Object} map GoogleMap object to add marker to
   **/
  Marker.prototype.addToMap = function ( map ) {
    this.state.marker.setMap( map.state.map );

    // Update internal bookkeeping
    this.state.map = map;

    // Update map's bookkeeping if necessary
    if ( map.state.markers.indexOf( this ) === -1 ) {
      map.state.markers.push( this );
    }
  };

  /**
   * Clear marker.  This sets the internal marker to null (so this object still
   * needs to be deleted separately).
   **/
  Marker.prototype.remove = function () {
    // Update map's bookkeeping first
    if ( this.state.map && this.state.map.markers && this.state.map.markers.length ) {
      for ( var i = this.state.map.markers.length; i > 0; i-- ) {
        if ( this.state.map.markers[ i ] === this ) {
          // Update the internal array
          this.state.map.markers.splice( i, 1 );
        }
      }
    }

    // Then null out the map
    this.state.marker.setMap( null );

    // And update internal bookkeeping
    this.state.map = null;
  };

  /**
   * Show marker again.  This only works if the marker was hidden instead of
   * deleted (still has its internal reference to the map intact).
   **/
  Marker.prototype.show = function () {
    if ( this.state.map ) {
      this.state.marker.setMap( this.state.map.state.map );
      this.state.visible = true;
    };
  };

  /**
   * Hide the marker.  Same idea as removing it, but does not null the map out
   * in case you need it back.
   **/
  Marker.prototype.hide = function () {
    this.state.marker.setMap( null );
    this.state.visible = false;
  };

  /**
   * Open marker's infobox (if it has one)
   **/
  Marker.prototype.openInfobox = function () {
    if ( this.state.infobox ) {
      this.state.infobox.open( this.state.map.state.map, this.state.marker );
    }
  };

  /**
   * Close marker's infobox (if it has one)
   **/
  Marker.prototype.closeInfobox = function () {
    if ( this.state.infobox ) { this.state.infobox.close(); }
  };

  /**
   * Custom hover functionality.  Will fire callback for specified event (along
   * with internal functions for same event as needed).
   *
   * @param {Function} overCallback Function to call on over event.  Will be
   * passed the event and label element if available.
   * @param {Function} leaveCallback Function to call on leave event. Will be
   * passed the event and label element if available.
   **/
  Marker.prototype.onHover = function ( overCallback, leaveCallback ) {
    var labelDiv = null;
    var eventDiv = null;

    if ( this.state.marker.label ) {
      labelDiv = this.state.marker.label.labelDiv_;
      eventDiv = this.state.marker.label.eventDiv_;
    }

    if ( overCallback && typeof( overCallback ) === 'function' ) {
      this.addEvent( 'mouseenter', (function ( event ) {
        overCallback.call( this, event, labelDiv, eventDiv );
      }).bind( this ));
    }
    if ( leaveCallback && typeof( leaveCallback ) === 'function' ) {
      this.addEvent( 'mouseleave', (function ( event ) {
        leaveCallback.call( this, event, labelDiv, eventDiv );
      }).bind( this ));
    }
  };

  /**
   * Custom click functionality.  Will fire callback for specified event (along
   * with internal functions for same event as needed).
   *
   * @param {Function} callback Function to call when even is triggered.  Will
   * be passed event and label element if available.
   **/
  Marker.prototype.onClick = function ( callback ) {
    var labelDiv = null;
    var eventDiv = null;

    if ( this.state.marker.label ) {
      labelDiv = this.state.marker.label.labelDiv_;
      eventDiv = this.state.marker.label.eventDiv_;
    }

    if ( callback && typeof( callback ) === 'function' ) {
      this.addEvent( 'click', (function ( event ) {
        callback.call( this, event, labelDiv, eventDiv );
      }).bind( this ));
    }
  };

  /**
   * Custom functionality to fire when infobox is finished rendering.
   *
   * @param {Function} callback Function to call when even is triggered
   **/
  Marker.prototype.onInfoboxReady = function ( callback ) {
    if ( callback && typeof( callback ) === 'function' ) {
      google.maps.event.addDomListener( this.state.infobox, 'domready', (function () {
        callback();
      }).bind( this ));
    }
  };

  /**
   * Add arbitrary event to marker.  Note that marker also has functions for
   * setting commonly-used events above.
   *
   * @param {String}   eventName Event name to tie into
   * @param {Function} callback  Function to call when even is triggered
   **/
  Marker.prototype.addEvent = function ( eventName, callback ) {
    if ( eventName && callback && typeof( callback ) === 'function' ) {
      // Pull the marker type because events have to be bound differently
      // on group markers because the damn label causes a very noticeable
      // "pop" when you go from marker to label
      if ( this.state.marker.label ) {
        this.state.marker.label.eventDiv_.addEventListener( eventName, callback );
      } else {
        google.maps.event.addListener( this.state.marker, eventName, callback );
      }
    } else {
      console.error( 'Invalid params passed to Marker.addEvent' );
    }
  };

  /**
   * Update internal data on the marker.  This can be anything related to the
   * marker and will be saved with the marker.  Will also be available to any
   * controllers attached to infoboxes on the marker.
   *
   * @param {Mixed} data Data to set with the marker
   */
  Marker.prototype.setData = function ( data ) {
    this.state.data = this.state.marker.data = data;
  };

  /**
   * Check if Marker is currently assigned to a map.
   *
   * @return {Boolean} Returns true if Marker is attached to a map
   */
  Marker.prototype.hasMap = function () {
    return this.state.map ? true : false;
  };

  /**
   * Return whether or not the Marker is currently visible.
   *
   * @return {Boolean} Returns visibility status
   */
  Marker.prototype.isVisible = function () {
    return this.state.visible;
  };

  /**
   * Default Marker config.
   **/
  Marker.prototype.config = {
    defaultMarkerOptions: {
      draggable: false,
      animation: null,
      position: { lat: 39.5579311, lng: -119.8508414 },
      icon: null
    }
  };

  /**
   * Internal state of marker (current map, marker data, etc.).
   **/
  Marker.prototype.state = {
    map: null,
    marker: null,
    data: null,
    infobox: null,
    infoboxContent: null,
    visible: true
  };

  /**
   * Error handling.
   **/
  Marker.prototype.errors = {
    init: function ( lat, lng, map, icon, width, height, options, data ) {
      if (
        typeof( google ) === 'undefined' ||
        typeof( google.maps ) === 'undefined'
      ) {
        console.error( 'Google Maps API not loaded.  Example include URL: //maps.googleapis.com/maps/api/js?key=key&sensor=false&libraries=geometry' );
      }
      if ( ! InfoBox ) {
        console.error( 'InfoBox library not loaded.  Marker infoboxes will not be available.  Get it: bower install google-maps-utility-library-v3 --save' );
      }
      if ( ! MarkerWithLabel ) {
        console.error( 'MarkerWithLabel library not loaded.  Markers with labels will not be available.  Get it: bower install google-maps-utility-library-v3 --save' );
      }
      if ( ! lat || ! lng ) {
        console.error( 'Valid lat/lng must be passed to create Marker' );
      }
    },
    jscrollpane: function () {
      console.error( 'JScrollPane must be loaded to create scrollable infobox content.  Get it: bower install jquery.jscrollpane --save.  Don\'t forget to add the CSS!' );
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // Cluster object ///////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////


  /**
   * Create a new cluster in the specified map with the specified master list
   * of markers.
   *
   * @param  {Array}   markers Array of Marker objects to assign to cluster
   * @param  {Object}  map     GoogleMap object to add cluster to (optional)
   * @param  {String}  icon    Cluster icon (png or svg, optional).  Default icon
   * will be used if this is not passed.
   * @param  {Integer} width   Cluster icon width (optional)
   * @param  {Integer} height  Cluster icon height (optional)
   * @param  {String}  label   Text or HTML to use as marker label (optional)
   * @param  {Mixed}   data    Additional data to save with Cluster object
   * @return {Object}          Returns constructed Cluster object
   **/
  var Cluster = function ( markers, map, icon, width, height, options, label, data ) {
    if ( google.maps.geometry ) {
      // Make sure this has a unique copy of the state object
      this.state = JSON.parse(JSON.stringify( this.state ));

      // As well as the events object
      this.events = JSON.parse(JSON.stringify( this.events ));

      // Update internal state with passed params
      this.state.icon    = icon;
      this.state.width   = width;
      this.state.height  = height,
      this.state.options = options;
      this.state.label   = label;
      this.state.data    = data;

      // Add any initial markers passed in
      if ( markers && markers.length ) { this.state.markers = markers; }

      // If map was passed, attach to map immediately and start clustering
      if ( map ) { this.setMap( map ); }

      // And back we go
      return this;
    } else {
      this.errors.init();
    }

    // Something didn't go right
    return null;
  };

  /**
   * Retrieve all markers currently in the cluster (displayed or not).
   *
   * @return {Array} Returns array of cluster Marker objects
   **/
  Cluster.prototype.getMarkers = function () {
    return this.state.markers;
  };

  /**
   * Retrieve currently-displayed markers in cluster.
   *
   * @return {Array} Returns array of cluster Marker objects
   **/
  Cluster.prototype.getActiveMarkers = function () {
    return this.state.currentMarkers;
  };

  /**
   * Set active map for Cluster.
   *
   * @param {Object} map GoogleMap object to attach Cluster to
   **/
  Cluster.prototype.setMap = function ( map ) {
    if ( map ) {
      // Set map internally
      this.state.map = map;

      // Bind clustering to map zoom event
      map.addEvent( 'zoom_changed', debounce(( function ( event ) {
        if ( this.state.markers.length ) {
          this.clusterMarkers();
        }
      }).bind( this ), 150 ));

      // And start clustering immediately if we also have markers
      if ( this.state.markers.length ) {
        this.clusterMarkers();
      }
    } else {
      console.error( 'Invalid map object passed to Cluster.setMap' );
    }
  };

  /**
   * Register an infobox for cluster markers.  This will be instantiated when
   * each cluster marker is created and has the same arguments as the Marker
   * flavor of this.
   *
   * @param {String}  content    Infobox content - can be HTML (optional)
   * @param {String}  closeIcon  Path to close icon to use for infobox (optional)
   * @param {String}  boxClass   Custom container class to apply to infobox
   * (optional)
   * @param {Object}  offset     Object containing x and y offset coordinates from
   * infobox marker (optional)
   * @param {Object}  options    Additional custom options to pass into InfoBox
   * constructor
   * @param {String}  openOn     Event to open infobox on.  Can be either 'hover'
   * or 'click.'  Defaults to hover.
   * @param {Boolean} scrollable Whether content should be scrollable or not
   * (requires JScrollPane)
   */
  Cluster.prototype.addInfobox = function ( content, closeIcon, boxClass, offset, options, openOn, scrollable, closeTimeout ) {
    this.state.infobox = {
      content: content,
      closeIcon: closeIcon,
      boxClass: boxClass,
      offset: offset,
      options: options,
      openOn: openOn,
      scrollable: scrollable,
      closeTimeout: closeTimeout
    };
  };

  /**
   * Callback fired just before cluster marker creation.  This function can be
   * used to return an args object will will override any of the args passed
   * to the cluster constructor (so this can be used to dynamically update a
   * cluster marker label for example).
   *
   * @param  {Function} callback Callback fired just before cluster marker
   * creation.  Function is passed the group of markers used to create the
   * cluster.
   */
  Cluster.prototype.onBeforeCreate = function ( callback ) {
    if ( callback && typeof( callback ) === 'function' ) {
      this.events.beforeCreate = callback;
    }
  };

  /**
   * Callback fired after the current set of display markers has been set on
   * the map (rendered).
   *
   * @param  {Function} callback Callback fired just after display markers are
   * rendered
   */
  Cluster.prototype.onRender = function ( callback ) {
    if ( callback && typeof( callback ) === 'function' ) {
      this.events.render = callback;
    }
  };

  /**
   * Register hover functions.  These will be applied to constructed Marker
   * objects as they are created.
   *
   * @param  {Function} overCallback  Function called on mouseenter
   * @param  {Function} leaveCallback Function called on mouseleave
   */
  Cluster.prototype.onHover = function ( overCallback, leaveCallback ) {
    if ( overCallback && typeof( overCallback ) === 'function' ) {
      this.events.mouseenter = overCallback;
    }

    if ( leaveCallback && typeof( leaveCallback ) === 'function' ) {
      this.events.mouseleave = leaveCallback;
    }
  };

  /**
   * Register click function.  This will be applied to constructed Marker
   * objects as they are created.
   *
   * @param  {Function} callback Function called on click
   */
  Cluster.prototype.onClick = function ( callback ) {
    if ( callback && typeof( callback ) === 'function' ) {
      this.events.click = callback;
    }
  };

  /**
   * Run a single round of marker clustering.  This will group markers based on
   * distance, build appropriate map markers for result and update the map with
   * finished markers.  Will do nothing if map is not set already.
   **/
  Cluster.prototype.clusterMarkers = function () {
    if ( this.state.map ) {
      // First clear existing list of markers
      this.clearMarkers();

      // If there are currently markers, run clustering
      if ( this.state.markers.length ) {
        // Make sure we're only grouping visible markers
        var visibleMarkers = this.state.markers.filter( function ( marker ) {
          return marker.isVisible();
        });

        if ( visibleMarkers.length ) {
          // Then group markers
          var groups = this.group( visibleMarkers );

          // Process groups of markers
          if ( groups && groups.length ) {
            groups.forEach( (function ( group ) {
              if ( group.markers.length > 1 ) {
                var args = {
                  lat: group.centroid.lat,
                  lng: group.centroid.lng,
                  map: this.state.map,
                  icon: this.state.icon,
                  width: this.state.width,
                  height: this.state.height,
                  options: this.state.options,
                  label: this.state.label,
                  data: this.state.data
                };

                // Check for any new args in beforeCreate callback before creating
                // marker object
                if ( this.events.beforeCreate ) {
                  overrides = this.events.beforeCreate( group );

                  if ( overrides && Object.keys( overrides ).length ) {
                    Object.keys( overrides ).forEach( function ( key ) {
                      args[ key ] = overrides[ key ];
                    });
                  }
                }

                // Build a new marker for the cluster
                var clusterMarker = new Marker(
                  args.lat,
                  args.lng,
                  args.map,
                  args.icon,
                  args.width,
                  args.height,
                  args.options,
                  args.label,
                  args.data
                );

                // Apply callback functions to new marker if needed
                if ( this.events.mouseenter || this.events.mouseleave ) {
                  clusterMarker.onHover( this.events.mouseenter, this.events.mouseleave );
                }

                if ( this.events.click ) {
                  clusterMarker.onClick( this.events.click );
                }

                // Create infobox for cluster marker if needed
                if ( this.state.infobox ) {
                  clusterMarker.addInfobox(
                    this.state.infobox.content,
                    this.state.infobox.closeIcon,
                    this.state.infobox.boxClass,
                    this.state.infobox.offset,
                    this.state.infobox.options,
                    this.state.infobox.openOn,
                    this.state.infobox.scrollable
                  );
                }

                // Save reference to markers and marker data with object as well
                clusterMarker.markerData = group.data;
                clusterMarker.markers    = group.markers;

                // And push the new cluster marker
                this.state.currentMarkers.push( clusterMarker );
              } else {
                // Well this is easy, just use stock marker
                this.state.currentMarkers.push( group.markers[ 0 ] );
              }
            }).bind( this ));

            // Now all the markers are built, place them on the map
            this.displayClusterMarkers();
          }
        }
      }
    } else {
      console.error( 'Map must be set before calling Cluster.clusterMarkers' );
    }
  };

  /**
   * Add constructed Marker object(s) to the Cluster.  Will trigger cluster
   * update when done (so generally it's better to pass arrays of new markers
   * rather than individual ones).
   *
   * @param {Mixed} marker Constructed Marker object or array of Markers
   **/
  Cluster.prototype.addMarkers = function ( markers ) {
    if ( markers ) {
      if ( markers.length ) {
        markers.forEach( (function ( marker ) {
          // Update bookkeeping
          this.state.markers.push( marker );
        }).bind( this ));
      } else {
        // Update bookkeeping
        this.state.markers.push( markers );
      }

      // Update clustering with new markers
      this.clusterMarkers();
    } else {
      console.error( 'Invalid Marker object/array passed to GoogleMap.addMarkers' );
    }
  };

  /**
   * Remove markers from the cluster and updates clustering.
   *
   * @param {Array} markers Markers to remove from cluster
   **/
  Cluster.prototype.removeMarkers = function ( markers ) {
    if (
      this.state.map &&
      this.state.markers &&
      this.state.markers.length
    ) {
      markers.forEach( ( function ( marker ) {
        this.removeMarker( marker );
      }).bind( this ));

      this.clusterMarkers();
    }
  };

  Cluster.prototype.removeMarker = function ( marker ) {
    var index = this.state.markers.indexOf( marker )

    if ( index > -1 ) {
      this.state.markers.splice( index, 1 );
    }
  };

  /**
   * Wipe all markers currently in the cluster.  Does not delete the master
   * list of markers, only the markers currently displayed on the map.
   **/
  Cluster.prototype.clearMarkers = function () {
    if (
      this.state.map &&
      this.state.currentMarkers &&
      this.state.currentMarkers.length
    ) {
      // Remove from the map
      this.state.currentMarkers.forEach( function ( marker ) {
        marker.remove();
      });

      // Then empty the currentMarkers array
      this.state.currentMarkers = [];
    }
  };

  /**
   * Remove all displayed markers and clear the internal array of markers.
   */
  Cluster.prototype.resetCluster = function () {
    this.clearMarkers();

    // Clear the internal list of markers
    this.state.markers = [];
  };

  /**
   * Show the current list of cluster markers.
   **/
  Cluster.prototype.displayClusterMarkers = function () {
    if (
      this.state.map &&
      this.state.currentMarkers &&
      this.state.currentMarkers.length
    ) {
      this.state.map.addMarkers( this.state.currentMarkers );

      // If render event is set, fire it with the set of displayed markers
      if ( this.events.render ) {
        this.events.render( this.state.currentMarkers );
      }
    }
  };

  /**
   * Group passed Marker objects based on passed distance.  Can be passed
   * markers and distance or will attempt to reference internal markers/map
   * zoom level for distance.
   *
   * @param {Array}   markers  Array of Marker objects to cluster (optional)
   * @param {Integer} distance Grouping distance (meters)
   **/
  Cluster.prototype.group = function ( markers, distance ) {
    var markers  = markers || this.state.markers;
    var distance = distance || this.getGroupingDistance();

    if ( markers && markers.length && distance ) {
      // Create scratch list of markers (working copy)
      var grouped = [];
      var scratch = markers.slice();

      // Find groups of markers
      var grouped = this.findMarkerGroups( distance, scratch, grouped );

      // Take raw marker groups, find the centroid and assign
      // to internal state array.  Also save property info if it
      // exists in the marker
      if ( grouped.length ) {
        var formattedGroups = [];

        grouped.forEach( function ( group ) {
          var formatted = { markers: group, data: [] };

          // Find the centroid
          if ( group.length ) {
            formatted.centroid = { lat: 0, lng: 0 };
            group.forEach( function ( marker ) {
              formatted.centroid.lat += marker.state.marker.getPosition().lat();
              formatted.centroid.lng += marker.state.marker.getPosition().lng();

              // Save marker data if it exists
              if ( marker.state.data ) { formatted.data.push( marker.state.data ) };
            });

            formatted.centroid.lat /= group.length;
            formatted.centroid.lng /= group.length;
          }

          formattedGroups.push( formatted );
        });

        // And return the groups
        return formattedGroups;
      }

      // If we got this far, just return nothing (there we not groups)
      return null;
    } else {
      this.errors.group( markers, distance );
    }
  };

  /**
   * Take master list of markers and recursively group them based on
   * distance.
   *
   * @param  {Integer} distance Distance to group markers under
   * @param  {Array}   scratch  Scratch list of markers to work from
   * @param  {Array}   grouped  Array of grouped markers
   * @return {Array}            Returns array of marker groups
   **/
  Cluster.prototype.findMarkerGroups = function ( distance, scratch, grouped ) {
    var group = this.findMarkerNeighbors( scratch.pop(), distance, scratch );

    // Save the new group
    grouped.push( group );

    // And call this again if there are still > 1 members in scratch
    // (need at least a marker and a neighbor to compare it with)
    if ( scratch.length > 1 ) {
      this.findMarkerGroups( distance, scratch, grouped );
    } else if ( scratch.length == 1 ) {
      // Guess there's only a group of 1 left.  Aww, forever alone. =(
      grouped.push([ scratch.pop() ]);
    }

    // All done, back we go
    return grouped;
  };

  /**
   * Take passed single marker and find neighbors within range in scratch list
   * of markers.
   *
   * @param  {Object}  marker   Marker object
   * @param  {Integer} distance Distance to group under (in meters)
   * @param  {Array}   scratch  Scratch list of Marker objects (NOT the actual
   * master list)
   * @return {Array}            Returns finished group array
   **/
  Cluster.prototype.findMarkerNeighbors = function ( marker, distance, scratch ) {
    var group = [];

    // Push the marker itself on as the first member of the group
    group.push( marker );

    // Iterate through the list checking distances as we go and grouping
    // if item is within specified distance of original marker.  This
    // iterates backwards so splicing out array entries doesn't affect
    // higher indices (the array will reindex every time a splice is done)
    for ( var i = scratch.length; i--; i > 0 ) {
      var distanceBetween = google.maps.geometry.spherical.computeDistanceBetween(
        marker.state.marker.getPosition(),
        scratch[i].state.marker.getPosition()
      );
      if ( distanceBetween <= distance ) {
        group.push( scratch.splice( i, 1 )[0] );
      }
    }

    // Return the finished group
    return group;
  };

  /**
   * Figure out what grouping distance should be used based on values
   * contained in the cluster config.
   *
   * @param  {Integer} zoom Zoom level (if not passed will reference internal
   * map zoom instead)
   * @return {Integer}      Returns grouping distance from config if matched or
   * 0 if unable to find match
   **/
  Cluster.prototype.getGroupingDistance = function ( zoom ) {
    var mapZoom       = zoom || this.state.map.state.map.getZoom();
    var zoomMapping   = this.config.clusterMapping;
    var groupDistance = zoomMapping[ mapZoom ] ? zoomMapping[ mapZoom ] : zoomMapping.default;

    return groupDistance ? groupDistance : 0;
  };

  /**
   * Set the zoom mapping for the cluster.  This is the clustering distance in
   * meters for each zoom level.  Note that lower zoom numbers are zoomed out.
   * Ex. config:
   * {
   *   8: 6000,
   *   9: 4500,
   *   10: 3000,
   *   11: 2500,
   *   12: 1500,
   *   13: 1500,
   *   14: 1000,
   *   15: 800, // Past level 15 markers aren't grouped
   *   default: 10000 // For really zoomed out levels, > 8
   * }
   * Either a full mapping can be passed in or a partial mapping and it will be
   * rolled into the existing mapping.
   *
   * @param {Object} mapping Mapping object following format in description
   **/
  Cluster.prototype.setClusterZoomMapping = function ( mapping ) {
    if ( mapping && Object.keys( mapping ).length ) {
      Object.keys( mapping ).forEach( ( function ( level ) {
        this.config.clusterMapping[ level ] = mapping[ level ];
      }).bind( this ));
    } else {
      console.error( 'Valid zoom mapping object must be passed to Cluster.setClusterZoomMapping' );
    }
  };

  /**
   * Clustering config options.
   **/
  Cluster.prototype.config = {
    clusterMapping: {
      8: 6000,
      9: 4500,
      10: 3000,
      11: 2500,
      12: 1500,
      13: 1500,
      14: 1000,
      15: 800, // Past level 15 markers aren't grouped
      default: 10000 // For really zoomed out levels, > 8
    }
  };

  /**
   * Internal state of cluster (current markers, current map, etc.).
   **/
  Cluster.prototype.state = {
    map: null,
    markers: [],
    currentMarkers: [],
    icon: null,
    width: null,
    height: null,
    options: null,
    label: null,
    data: null,
    infobox: null
  };

  /**
   * Internal registry for event handlers.  These are passed on to Cluster
   * Marker objects as they are created.
   *
   * @type {Object}
   */
  Cluster.prototype.events = {
    beforeCreate: null,
    render: null,
    mouseenter: null,
    mouseleave: null,
    click: null
  };

  /**
   * Error handling.
   **/
  Cluster.prototype.errors = {
    init: function () {
      if ( ! google.maps.geometry ) {
        console.error( 'Geometry library for Google Maps API not loaded.  Clustering will not be available.  Example include URL: //maps.googleapis.com/maps/api/js?key=key&sensor=false&libraries=geometry' );
      }
    },
    group: function ( markers, distance ) {
      if ( ! markers || ! markers.length ) {
        console.error( 'Empty marker list passed to Cluster.group' );
      }
      if ( ! distance ) {
        console.error( 'Invalid distance passed to Cluster.group' );
      }
    }
  };

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


  /////////////////////////////////////////////////////////////////////////////
  // Back to the studio ///////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////

  // Bundle everything up and back we go
  return {
    $get: function () {
      return { GoogleMap: GoogleMap, Marker: Marker, Cluster: Cluster };
    }
  };

}]);
