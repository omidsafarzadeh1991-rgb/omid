package ir.omid.samplingapp.ui.common

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import ir.omid.samplingapp.R
import ir.omid.samplingapp.data.model.RequestStatus

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) {
    val (labelRes, color) = when (status) {
        RequestStatus.PENDING.name -> R.string.status_pending to MaterialTheme.colorScheme.tertiary
        RequestStatus.CONFIRMED.name -> R.string.status_confirmed to MaterialTheme.colorScheme.primary
        RequestStatus.REJECTED.name -> R.string.status_rejected to MaterialTheme.colorScheme.error
        RequestStatus.DONE.name -> R.string.status_done to MaterialTheme.colorScheme.outline
        else -> R.string.status_pending to MaterialTheme.colorScheme.tertiary
    }
    Surface(
        color = color.copy(alpha = 0.15f),
        contentColor = color,
        shape = RoundedCornerShape(50),
        modifier = modifier
    ) {
        Text(
            text = stringResource(labelRes),
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
        )
    }
}
