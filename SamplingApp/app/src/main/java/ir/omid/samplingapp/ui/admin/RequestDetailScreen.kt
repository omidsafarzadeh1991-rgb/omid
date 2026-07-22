package ir.omid.samplingapp.ui.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import ir.omid.samplingapp.R
import ir.omid.samplingapp.data.model.RequestStatus
import ir.omid.samplingapp.data.model.SampleRequest
import ir.omid.samplingapp.ui.common.StatusBadge
import ir.omid.samplingapp.ui.map.NeshanMapHost

@Composable
fun RequestDetailScreen(
    request: SampleRequest,
    onBack: () -> Unit,
    onConfirm: () -> Unit,
    onReject: () -> Unit,
    onMarkDone: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.request_details)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Box(modifier = Modifier.fillMaxWidth().height(220.dp)) {
                NeshanMapHost(
                    initialLat = request.lat,
                    initialLng = request.lng,
                    onMapReady = {},
                    onMapClick = { _, _ -> }
                )
                Icon(
                    imageVector = Icons.Default.Place,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.Center).size(40.dp)
                )
            }

            Column(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(request.patientName, style = MaterialTheme.typography.titleMedium)
                    StatusBadge(status = request.status)
                }
                Text(request.patientPhone, style = MaterialTheme.typography.bodyMedium)
                Text(request.addressText, style = MaterialTheme.typography.bodyMedium)
                if (request.note.isNotBlank()) {
                    Text(
                        request.note,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                when (request.status) {
                    RequestStatus.PENDING.name -> {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(onClick = onConfirm, modifier = Modifier.weight(1f)) {
                                Text(stringResource(R.string.confirm_request))
                            }
                            OutlinedButton(
                                onClick = onReject,
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Text(stringResource(R.string.reject_request))
                            }
                        }
                    }

                    RequestStatus.CONFIRMED.name -> {
                        Button(onClick = onMarkDone, modifier = Modifier.fillMaxWidth()) {
                            Text(stringResource(R.string.mark_done))
                        }
                    }

                    else -> Unit
                }
            }
        }
    }
}
