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
