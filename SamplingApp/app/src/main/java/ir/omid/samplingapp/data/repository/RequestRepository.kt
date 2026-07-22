package ir.omid.samplingapp.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import ir.omid.samplingapp.data.model.RequestStatus
import ir.omid.samplingapp.data.model.SampleRequest
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class RequestRepository(
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val requests get() = db.collection("requests")

    suspend fun submitRequest(request: SampleRequest): String {
        val doc = requests.document()
        val withId = request.copy(id = doc.id, createdAt = Timestamp.now())
        doc.set(withId).await()
        return doc.id
    }

    /** Realtime stream of the signed-in patient's own requests, newest first. */
    fun observeMyRequests(patientId: String): Flow<List<SampleRequest>> =
        observe(requests.whereEqualTo("patientId", patientId))

    /** Realtime stream of requests still waiting for the provider's confirmation. */
    fun observePendingRequests(): Flow<List<SampleRequest>> =
        observe(requests.whereEqualTo("status", RequestStatus.PENDING.name))

    /** Realtime stream of every request, for the provider's full history view. */
    fun observeAllRequests(): Flow<List<SampleRequest>> =
        observe(requests)

    private fun observe(query: Query): Flow<List<SampleRequest>> = callbackFlow {
        val registration = query
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                trySend(snapshot?.toObjects(SampleRequest::class.java).orEmpty())
            }
        awaitClose { registration.remove() }
    }

    suspend fun updateStatus(requestId: String, status: RequestStatus, confirmedBy: String) {
        val updates = mutableMapOf<String, Any>("status" to status.name)
        if (status == RequestStatus.CONFIRMED) {
            updates["confirmedAt"] = Timestamp.now()
            updates["confirmedBy"] = confirmedBy
        }
        requests.document(requestId).update(updates).await()
    }
}
