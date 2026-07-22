package ir.omid.samplingapp.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import ir.omid.samplingapp.data.model.UserProfile
import ir.omid.samplingapp.data.model.UserRole
import kotlinx.coroutines.tasks.await

class UserRepository(
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val users get() = db.collection("users")

    suspend fun getProfile(uid: String): UserProfile? {
        val snap = users.document(uid).get().await()
        return snap.toObject(UserProfile::class.java)
    }

    /**
     * Creates the Firestore profile for a freshly signed-in user. New users always
     * start as PATIENT — an admin promotes accounts to ADMIN manually in the
     * Firebase console (see SETUP.md).
     */
    suspend fun createPatientProfile(uid: String, phone: String, name: String) {
        val profile = UserProfile(
            uid = uid,
            phone = phone,
            name = name,
            role = UserRole.PATIENT.name,
            createdAt = Timestamp.now()
        )
        users.document(uid).set(profile).await()
    }
}
