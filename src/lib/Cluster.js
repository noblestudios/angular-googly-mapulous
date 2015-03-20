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
    if ( markers && markers.length && google.maps.geometry ) {
      // Make sure this has a unique copy of the state object
      this.state = JSON.parse(JSON.stringify( this.state ));

      // Update internal state with passed params
      this.state.markers = markers;
      this.state.icon    = icon;
      this.state.width   = width;
      this.state.height  = height,
      this.state.options = options;
      this.state.label   = label;
      this.state.data    = data;

      // If map was passed, attach to map immediately and start clustering
      if ( map ) { this.setMap( map ); }

      // And back we go
      return this;
    } else {
      this.errors.init( markers );
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
        this.clusterMarkers();
      }).bind( this ), 150 ));

      // And start clustering immediately
      this.clusterMarkers();
    } else {
      console.error( 'Invalid map object passed to Cluster.setMap' );
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

      // Then group markers
      var groups = this.group();

      // Process groups of markers
      if ( groups && groups.length ) {
        groups.forEach( (function ( group ) {
          if ( group.markers.length > 1 ) {
            // Build a new marker for the cluster
            var clusterMarker = new Marker(
              group.centroid.lat,
              group.centroid.lng,
              null,
              this.state.icon,
              this.state.width,
              this.state.height,
              this.state.options,
              this.state.label,
              this.state.data
            );

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
      this.state.map.removeMarkers( this.state.currentMarkers );

      // Then empty the currentMarkers array
      this.state.currentMarkers = [];
    }
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
   *
   * @param {Object} mapping Mapping object following format in description
   **/
  Cluster.prototype.setClusterZoomMapping = function ( mapping ) {
    if ( mapping ) {
      this.config.clusterMapping = mapping;
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
    data: null
  };

  /**
   * Error handling.
   **/
  Cluster.prototype.errors = {
    init: function ( markers ) {
      if ( ! google.maps.geometry ) {
        console.error( 'Geometry library for Google Maps API not loaded.  Clustering will not be available.  Example include URL: //maps.googleapis.com/maps/api/js?key=key&sensor=false&libraries=geometry' );
      }
      if ( ! markers || ! markers.length ) {
        console.error( 'Valid array of Marker objects must be passed to Cluster object' );
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
