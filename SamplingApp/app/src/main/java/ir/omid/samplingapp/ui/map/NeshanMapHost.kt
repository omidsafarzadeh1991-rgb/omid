package ir.omid.samplingapp.ui.map

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import ir.omid.samplingapp.util.Constants
import org.neshan.common.model.LatLng
import org.neshan.mapsdk.MapView

private const val PICK_ZOOM = 16f

/**
 * Thin Compose wrapper around Neshan's native MapView.
 *
 * This is the ONLY file that talks to the native `neshan-android-sdk:mobile-sdk`
 * classes directly. `setApiKey` / `moveCamera` / `setOnMapClickListener` match the
 * SDK's public API as of mobile-sdk 1.0.x; if the version Gradle resolves differs,
 * Android Studio's autocomplete on `mapView.` will surface the current method
 * names immediately, and only this file needs adjusting.
 *
 * Design: instead of dropping a native marker (an extra SDK dependency surface),
 * the caller re-centers the camera on every tap and draws a plain Compose pin
 * icon fixed at the center of the map Box — see AddressPickerScreen.
 */
@Composable
fun NeshanMapHost(
    modifier: Modifier = Modifier,
    initialLat: Double = Constants.DEFAULT_LAT,
    initialLng: Double = Constants.DEFAULT_LNG,
    onMapReady: (MapView) -> Unit,
    onMapClick: (lat: Double, lng: Double) -> Unit
) {
    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            MapView(context).apply {
                setApiKey(Constants.NESHAN_API_KEY)
                moveCamera(LatLng(initialLat, initialLng), 14f)
                setOnMapClickListener { latLng, _ ->
                    moveCamera(latLng, PICK_ZOOM)
                    onMapClick(latLng.latitude, latLng.longitude)
                }
                onMapReady(this)
            }
        }
    )
}
