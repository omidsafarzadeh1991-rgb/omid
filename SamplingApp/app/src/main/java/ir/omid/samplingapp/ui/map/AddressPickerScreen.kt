package ir.omid.samplingapp.ui.map

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import ir.omid.samplingapp.R
import ir.omid.samplingapp.data.remote.NeshanApi
import ir.omid.samplingapp.util.Constants
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.neshan.mapsdk.MapView

@SuppressLint("MissingPermission")
@Composable
fun AddressPickerScreen(
    onBack: () -> Unit,
    onAddressConfirmed: (lat: Double, lng: Double, address: String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var mapView by remember { mutableStateOf<MapView?>(null) }
    var selectedLat by remember { mutableStateOf(Constants.DEFAULT_LAT) }
    var selectedLng by remember { mutableStateOf(Constants.DEFAULT_LNG) }
    var addressText by remember { mutableStateOf("") }
    var isResolving by remember { mutableStateOf(false) }

    fun resolveAddress(lat: Double, lng: Double) {
        scope.launch {
            isResolving = true
            addressText = try {
                val result = NeshanApi.instance.reverseGeocode(Constants.NESHAN_API_KEY, lat, lng)
                result.formattedAddress ?: ""
            } catch (e: Exception) {
                ""
            }
            isResolving = false
        }
    }

    fun moveToDeviceLocation() {
        val fused = LocationServices.getFusedLocationProviderClient(context)
        scope.launch {
            val location = fused.lastLocation.await()
            if (location != null) {
                selectedLat = location.latitude
                selectedLng = location.longitude
                mapView?.moveCamera(
                    org.neshan.common.model.LatLng(location.latitude, location.longitude),
                    16f
                )
                resolveAddress(location.latitude, location.longitude)
            }
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> if (granted) moveToDeviceLocation() }

    LaunchedEffect(Unit) {
        resolveAddress(selectedLat, selectedLng)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.pick_on_map)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                NeshanMapHost(
                    modifier = Modifier.fillMaxSize(),
                    initialLat = selectedLat,
                    initialLng = selectedLng,
                    onMapReady = { mapView = it },
                    onMapClick = { lat, lng ->
                        selectedLat = lat
                        selectedLng = lng
                        resolveAddress(lat, lng)
                    }
                )

                // Fixed center pin: the tapped/panned point always ends up at the
                // screen center because NeshanMapHost re-centers the camera on tap.
                Icon(
                    imageVector = Icons.Default.Place,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.Center).size(40.dp)
                )

                SmallFloatingActionButton(
                    onClick = {
                        val granted = ContextCompat.checkSelfPermission(
                            context, Manifest.permission.ACCESS_FINE_LOCATION
                        ) == PackageManager.PERMISSION_GRANTED
                        if (granted) {
                            moveToDeviceLocation()
                        } else {
                            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                        }
                    },
                    modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp)
                ) {
                    Icon(Icons.Default.MyLocation, contentDescription = stringResource(R.string.use_my_location))
                }
            }

            Surface(shadowElevation = 8.dp) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(stringResource(R.string.map_pick_instruction), style = MaterialTheme.typography.bodySmall)

                    if (isResolving) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            addressText.ifBlank { "—" },
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }

                    Button(
                        onClick = { onAddressConfirmed(selectedLat, selectedLng, addressText) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isResolving
                    ) {
                        Text(stringResource(R.string.confirm_address))
                    }
                }
            }
        }
    }
}
