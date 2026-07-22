package ir.omid.samplingapp

import android.app.Application
import com.google.firebase.FirebaseApp

class SamplingApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
