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
