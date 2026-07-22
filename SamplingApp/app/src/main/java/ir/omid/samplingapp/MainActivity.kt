package ir.omid.samplingapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import ir.omid.samplingapp.ui.navigation.SamplingNavGraph
import ir.omid.samplingapp.ui.theme.SamplingAppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SamplingAppTheme {
                SamplingNavGraph()
            }
        }
    }
}
