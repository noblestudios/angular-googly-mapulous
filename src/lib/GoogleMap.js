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
