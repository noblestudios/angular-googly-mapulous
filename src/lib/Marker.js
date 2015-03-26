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
   **/
  Marker.prototype.addInfobox = function ( content, closeIcon, boxClass, offset, options, openOn, scrollable ) {
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

        // Set up close timeout on rendered infobox element
        infobox.div_.addEventListener( 'mouseenter', function () {
          if ( typeof( infobox.closeTimer ) == 'number' ) {
              clearTimeout( infobox.closeTimer );
          }
        });

        infobox.div_.addEventListener( 'mouseleave', function () {
          infobox.closeTimer = setTimeout( function () {
              infobox.close();
          }, 2 * 1000 );
        });

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

    // Update bookkeeping
    this.state.map = map;
  };

  /**
   * Clear marker.  This sets the internal marker to null (so this object still
   * needs to be deleted separately).
   **/
  Marker.prototype.remove = function () {
    this.state.marker.setMap( null );

    // Make sure to null out the map object
    this.state.map = null;
  };

  /**
   * Show marker again.  This only works if the marker was hidden instead of
   * deleted (still has its internal reference to the map intact).
   **/
  Marker.prototype.show = function () {
    if ( this.state.map ) { this.state.marker.setMap( this.state.map.state.map ) };
  };

  /**
   * Hide the marker.  Same idea as removing it, but does not null the map out
   * in case you need it back.
   **/
  Marker.prototype.hide = function () {
    this.state.marker.setMap( null );
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
   * @param {Function} overCallback Function to call on over event
   * @param {Function} leaveCallback Function to call on leave event
   **/
  Marker.prototype.onHover = function ( overCallback, leaveCallback ) {
    if ( overCallback && typeof( overCallback ) === 'function' ) {
      this.addEvent( 'mouseover', overCallback );
    }
    if ( leaveCallback && typeof( leaveCallback ) === 'function' ) {
      this.addEvent( 'mouseleave', leaveCallback );
    }
  };

  /**
   * Custom click functionality.  Will fire callback for specified event (along
   * with internal functions for same event as needed).
   *
   * @param {Function} callback Function to call when even is triggered
   **/
  Marker.prototype.onClick = function ( callback ) {
    if ( callback && typeof( callback ) === 'function' ) {
      this.addEvent( 'click', callback );
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
    infoboxContent: null
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
