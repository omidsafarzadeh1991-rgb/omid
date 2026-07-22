package ir.omid.samplingapp.data.model

import com.google.firebase.Timestamp

// @JvmOverloads is required so Firestore's reflection-based toObject() can find
// a public no-arg constructor (Kotlin doesn't emit one for data classes by default).
data class SampleRequest @JvmOverloads constructor(
    val id: String = "",
    val patientId: String = "",
    val patientName: String = "",
    val patientPhone: String = "",
    val addressText: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val note: String = "",
    val status: String = RequestStatus.PENDING.name,
    val createdAt: Timestamp? = null,
    val confirmedAt: Timestamp? = null,
    val confirmedBy: String = ""
)
