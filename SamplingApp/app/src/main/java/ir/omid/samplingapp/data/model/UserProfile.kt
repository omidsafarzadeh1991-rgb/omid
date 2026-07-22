package ir.omid.samplingapp.data.model

import com.google.firebase.Timestamp

// @JvmOverloads is required so Firestore's reflection-based toObject() can find
// a public no-arg constructor (Kotlin doesn't emit one for data classes by default).
data class UserProfile @JvmOverloads constructor(
    val uid: String = "",
    val phone: String = "",
    val name: String = "",
    val role: String = UserRole.PATIENT.name,
    val createdAt: Timestamp? = null
)
