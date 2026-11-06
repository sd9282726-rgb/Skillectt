import Foundation
import Combine
import Security

private enum Backend {
    static let baseURL = URL(string: "https://chohswyxsckpwyzlbzav.supabase.co")!
    static let publishableKey = "sb_publishable__1Bd6TEnLWDtTdT4U4e-oQ_0MeY2E17"
}

struct AuthUser: Decodable { let id: String }
struct AuthResponse: Decodable {
    let access_token: String
    let user: AuthUser
}
struct PostProfile: Decodable {
    let displayName: String?
    let username: String?
    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case username
    }
}
struct FeedPost: Decodable, Identifiable {
    let id: String
    let author_id: String
    let content: String
    let image_url: String?
    let likes_count: Int
    let comments_count: Int
    let profiles: PostProfile?
    var imageURL: String? { image_url }
    var authorId: String { author_id }
}
struct FeedComment: Decodable, Identifiable {
    let id: String
    let content: String
    let profiles: PostProfile?
}
struct DirectoryProfile: Decodable, Identifiable {
    let id: String
    let display_name: String
    let username: String
    let bio: String
}
struct NativeProject: Decodable, Identifiable {
    let id: String
    let title: String
    let description: String
    let status: String
}
struct NativeCommunity: Decodable, Identifiable {
    let id: String
    let name: String
    let description: String
    let member_count: Int
}
struct NativeConversation: Identifiable { let id: String; var title: String { "Conversation \(id.prefix(8))" } }
struct NativeChatMessage: Decodable, Identifiable { let id: String; let sender_id: String; let content: String }
struct NativeNotification: Decodable, Identifiable {
    let id: String
    let type: String
    let message: String?
    let read: Bool
}

@MainActor
final class AppModel: ObservableObject {
    @Published var accessToken: String? = Keychain.read()
    @Published var userId: String? = nil
    @Published var posts: [FeedPost] = []
    @Published var likedIds: Set<String> = []
    @Published var savedIds: Set<String> = []
    @Published var comments: [FeedComment] = []
    @Published var directory: [DirectoryProfile] = []
    @Published var followingIds: Set<String> = []
    @Published var projects: [NativeProject] = []
    @Published var communities: [NativeCommunity] = []
    @Published var joinedCommunityIds: Set<String> = []
    @Published var notifications: [NativeNotification] = []
    @Published var conversations: [NativeConversation] = []
    @Published var activeConversationId: String?
    @Published var chatMessages: [NativeChatMessage] = []
    @Published var currentProfile: DirectoryProfile?
    @Published var isBusy = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    func restoreSession() async {
        guard accessToken != nil else { return }
        do {
            let data = try await request(path: "/auth/v1/user")
            let user = try JSONDecoder().decode(AuthUser.self, from: data)
            userId = user.id
            await loadFeed()
        } catch { errorMessage = error.localizedDescription }
    }

    func signIn(email: String, password: String) async {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            let data = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
            let result = try await request(path: "/auth/v1/token?grant_type=password", method: "POST", body: data, authenticated: false)
            let auth = try JSONDecoder().decode(AuthResponse.self, from: result)
            accessToken = auth.access_token
            userId = auth.user.id
            Keychain.save(auth.access_token)
            await loadFeed()
            await loadDirectory()
        } catch { errorMessage = error.localizedDescription }
    }

    func signUp(email: String, password: String, displayName: String, username: String) async {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            let metadata: [String: Any] = ["display_name": displayName.trimmingCharacters(in: .whitespacesAndNewlines), "username": username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()]
            let body = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password, "data": metadata])
            let result = try await request(path: "/auth/v1/signup", method: "POST", body: body, authenticated: false)
            if let auth = try? JSONDecoder().decode(AuthResponse.self, from: result) {
                accessToken = auth.access_token
                userId = auth.user.id
                Keychain.save(auth.access_token)
                await loadFeed()
                await loadDirectory()
            } else {
                errorMessage = "Account created. Check your email if confirmation is enabled, then sign in."
            }
        } catch { errorMessage = error.localizedDescription }
    }

    func sendPasswordReset(email: String) async {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines)])
            _ = try await request(path: "/auth/v1/recover", method: "POST", body: body, authenticated: false)
            errorMessage = "If an account exists for this email, password reset instructions have been sent."
        } catch { errorMessage = error.localizedDescription }
    }

    func loadFeed() async {
        guard accessToken != nil else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let data = try await request(path: "/rest/v1/posts?select=id,author_id,content,image_url,likes_count,comments_count,profiles(display_name,username)&order=created_at.desc&limit=50")
            posts = try JSONDecoder().decode([FeedPost].self, from: data)
            if let me = userId {
                let likes = try await request(path: "/rest/v1/post_likes?select=post_id&user_id=eq.\(me)")
                let likeRows = try JSONSerialization.jsonObject(with: likes) as? [[String: String]] ?? []
                likedIds = Set(likeRows.compactMap { $0["post_id"] })
                let saves = try await request(path: "/rest/v1/saved_posts?select=post_id&user_id=eq.\(me)")
                let saveRows = try JSONSerialization.jsonObject(with: saves) as? [[String: String]] ?? []
                savedIds = Set(saveRows.compactMap { $0["post_id"] })
            }
            errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
    }

    func createPost(_ content: String, imageData: Data? = nil, imageMime: String? = nil) async {
        guard let me = userId else { return }
        let cleanText = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanText.isEmpty || imageData != nil else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            var imageURL: String?
            if let imageData {
                guard imageData.count <= 12 * 1024 * 1024 else { throw NSError(domain: "Skillect", code: 413, userInfo: [NSLocalizedDescriptionKey: "Image must be 12 MB or smaller"]) }
                let mime = imageMime ?? "image/jpeg"
                guard mime.hasPrefix("image/") else { throw NSError(domain: "Skillect", code: 415, userInfo: [NSLocalizedDescriptionKey: "Choose an image file"]) }
                let ext = mime == "image/jpeg" ? "jpg" : (mime as NSString).pathExtension.isEmpty ? "img" : (mime as NSString).pathExtension
                let objectPath = "\(me)/\(UUID().uuidString.lowercased()).\(ext)"
                var upload = URLRequest(url: URL(string: "storage/v1/object/post-media/\(objectPath)", relativeTo: Backend.baseURL)!.absoluteURL)
                upload.httpMethod = "POST"
                upload.setValue(Backend.publishableKey, forHTTPHeaderField: "apikey")
                if let accessToken { upload.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization") }
                upload.setValue(mime, forHTTPHeaderField: "Content-Type")
                upload.setValue("false", forHTTPHeaderField: "x-upsert")
                upload.httpBody = imageData
                let (uploadData, uploadResponse) = try await URLSession.shared.data(for: upload)
                guard let http = uploadResponse as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                    throw NSError(domain: "Skillect", code: (uploadResponse as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: String(data: uploadData, encoding: .utf8) ?? "Image upload failed"])
                }
                imageURL = URL(string: "storage/v1/object/public/post-media/\(objectPath)", relativeTo: Backend.baseURL)!.absoluteURL.absoluteString
            }
            var post: [String: Any] = ["author_id": me, "content": cleanText, "tags": [String]()]
            if let imageURL { post["image_url"] = imageURL }
            let body = try JSONSerialization.data(withJSONObject: post)
            _ = try await request(path: "/rest/v1/posts", method: "POST", body: body, prefer: "return=minimal")
            await loadFeed()
        } catch { errorMessage = error.localizedDescription }
    }

    func toggleLike(_ post: FeedPost) async {
        guard let me = userId else { return }
        do {
            if likedIds.contains(post.id) {
                _ = try await request(path: "/rest/v1/post_likes?post_id=eq.\(post.id)&user_id=eq.\(me)", method: "DELETE", prefer: "return=minimal")
                likedIds.remove(post.id)
            } else {
                let body = try JSONSerialization.data(withJSONObject: ["post_id": post.id, "user_id": me])
                _ = try await request(path: "/rest/v1/post_likes", method: "POST", body: body, prefer: "return=minimal")
                likedIds.insert(post.id)
            }
            await loadFeed()
        } catch { errorMessage = error.localizedDescription }
    }

    func toggleSave(_ post: FeedPost) async {
        guard let me = userId else { return }
        do {
            if savedIds.contains(post.id) {
                _ = try await request(path: "/rest/v1/saved_posts?post_id=eq.\(post.id)&user_id=eq.\(me)", method: "DELETE", prefer: "return=minimal")
                savedIds.remove(post.id)
            } else {
                let body = try JSONSerialization.data(withJSONObject: ["post_id": post.id, "user_id": me])
                _ = try await request(path: "/rest/v1/saved_posts", method: "POST", body: body, prefer: "return=minimal")
                savedIds.insert(post.id)
            }
        } catch { errorMessage = error.localizedDescription }
    }

    func loadComments(postId: String) async {
        do {
            let data = try await request(path: "/rest/v1/comments?select=id,content,profiles(display_name,username)&post_id=eq.\(postId)&order=created_at.asc&limit=100")
            comments = try JSONDecoder().decode([FeedComment].self, from: data)
        } catch { errorMessage = error.localizedDescription }
    }

    func addComment(postId: String, content: String) async {
        guard let me = userId, !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["post_id": postId, "author_id": me, "content": content.trimmingCharacters(in: .whitespacesAndNewlines)])
            _ = try await request(path: "/rest/v1/comments", method: "POST", body: body, prefer: "return=minimal")
            await loadComments(postId: postId)
            await loadFeed()
        } catch { errorMessage = error.localizedDescription }
    }


    func loadDirectory() async {
        do {
            let profilesData = try await request(path: "/rest/v1/profiles?select=id,display_name,username,bio&order=created_at.desc&limit=100")
            directory = try JSONDecoder().decode([DirectoryProfile].self, from: profilesData)
            currentProfile = directory.first(where: { $0.id == userId })
            if let me = userId {
                let followData = try await request(path: "/rest/v1/follows?select=following_id&follower_id=eq.\(me)")
                let followRows = try JSONSerialization.jsonObject(with: followData) as? [[String: String]] ?? []
                followingIds = Set(followRows.compactMap { $0["following_id"] })
            }
            let projectData = try await request(path: "/rest/v1/projects?select=id,title,description,status&order=created_at.desc&limit=100")
            projects = try JSONDecoder().decode([NativeProject].self, from: projectData)
            let communityData = try await request(path: "/rest/v1/communities?select=id,name,description,member_count&order=created_at.desc&limit=100")
            communities = try JSONDecoder().decode([NativeCommunity].self, from: communityData)
            if let me = userId {
                let memberData = try await request(path: "/rest/v1/community_members?select=community_id&user_id=eq.\(me)")
                let memberRows = try JSONSerialization.jsonObject(with: memberData) as? [[String: String]] ?? []
                joinedCommunityIds = Set(memberRows.compactMap { $0["community_id"] })
            }
            if let me = userId {
                let notificationData = try await request(path: "/rest/v1/notifications?select=id,type,message,read&user_id=eq.\(me)&order=created_at.desc&limit=50")
                notifications = try JSONDecoder().decode([NativeNotification].self, from: notificationData)
            }
        } catch { errorMessage = error.localizedDescription }
    }

    func updateProfile(displayName: String, bio: String) async {
        guard let me = userId else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["display_name": displayName, "bio": bio])
            _ = try await request(path: "/rest/v1/profiles?id=eq.\(me)", method: "PATCH", body: body, prefer: "return=minimal")
            await loadDirectory()
        } catch { errorMessage = error.localizedDescription }
    }

    func createProject(title: String, description: String) async {
        guard let me = userId, !title.isEmpty, !description.isEmpty else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["author_id": me, "title": title, "description": description, "status": "in_progress"])
            _ = try await request(path: "/rest/v1/projects", method: "POST", body: body, prefer: "return=minimal")
            await loadDirectory()
        } catch { errorMessage = error.localizedDescription }
    }

    func joinCommunity(_ communityId: String) async {
        guard let me = userId, !joinedCommunityIds.contains(communityId) else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["community_id": communityId, "user_id": me])
            _ = try await request(path: "/rest/v1/community_members", method: "POST", body: body, prefer: "return=minimal")
            joinedCommunityIds.insert(communityId)
        } catch { errorMessage = error.localizedDescription }
    }

    func reportPost(_ postId: String) async {
        guard let me = userId else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["reporter_id": me, "target_type": "post", "target_id": postId, "reason": "inappropriate_content"])
            _ = try await request(path: "/rest/v1/reports", method: "POST", body: body, prefer: "return=minimal")
        } catch { errorMessage = error.localizedDescription }
    }

    func blockUser(_ targetId: String) async {
        guard let me = userId, me != targetId else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["blocker_id": me, "blocked_id": targetId])
            _ = try await request(path: "/rest/v1/blocks", method: "POST", body: body, prefer: "return=minimal")
            directory.removeAll { $0.id == targetId }
        } catch { errorMessage = error.localizedDescription }
    }

    func toggleFollow(_ targetId: String) async {
        guard let me = userId, me != targetId else { return }
        do {
            if followingIds.contains(targetId) {
                _ = try await request(path: "/rest/v1/follows?follower_id=eq.\(me)&following_id=eq.\(targetId)", method: "DELETE", prefer: "return=minimal")
                followingIds.remove(targetId)
            } else {
                let body = try JSONSerialization.data(withJSONObject: ["follower_id": me, "following_id": targetId])
                _ = try await request(path: "/rest/v1/follows", method: "POST", body: body, prefer: "return=minimal")
                followingIds.insert(targetId)
            }
        } catch { errorMessage = error.localizedDescription }
    }

    func loadConversations() async {
        guard let me = userId else { return }
        do {
            let data = try await request(path: "/rest/v1/conversation_participants?select=conversation_id&user_id=eq.\\(me)")
            let rows = try JSONSerialization.jsonObject(with: data) as? [[String: String]] ?? []
            let ids = Array(Set(rows.compactMap { $0["conversation_id"] })).sorted()
            conversations = ids.map { NativeConversation(id: $0) }
        } catch { errorMessage = error.localizedDescription }
    }

    func loadChatMessages(_ conversationId: String) async {
        do {
            let data = try await request(path: "/rest/v1/messages?select=id,sender_id,content&conversation_id=eq.\\(conversationId)&order=created_at.asc&limit=200")
            chatMessages = try JSONDecoder().decode([NativeChatMessage].self, from: data)
        } catch { errorMessage = error.localizedDescription }
    }

    func startConversation(with targetId: String) async {
        guard let me = userId, me != targetId else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["created_by": me])
            let data = try await request(path: "/rest/v1/conversations", method: "POST", body: body, prefer: "return=representation")
            let rows = try JSONSerialization.jsonObject(with: data) as? [[String: String]] ?? []
            guard let conversationId = rows.first?["id"] else { throw NSError(domain: "Skillect", code: 1, userInfo: [NSLocalizedDescriptionKey: "Conversation could not be created"]) }
            for participant in [me, targetId] {
                let participantBody = try JSONSerialization.data(withJSONObject: ["conversation_id": conversationId, "user_id": participant])
                _ = try await request(path: "/rest/v1/conversation_participants", method: "POST", body: participantBody, prefer: "return=minimal")
            }
            await loadConversations()
            activeConversationId = conversationId
            await loadChatMessages(conversationId)
        } catch { errorMessage = error.localizedDescription }
    }

    func sendChatMessage(_ content: String) async {
        guard let me = userId, let conversationId = activeConversationId else { return }
        let clean = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["conversation_id": conversationId, "sender_id": me, "content": clean])
            _ = try await request(path: "/rest/v1/messages", method: "POST", body: body, prefer: "return=minimal")
            await loadChatMessages(conversationId)
        } catch { errorMessage = error.localizedDescription }
    }

    func markNotificationRead(_ id: String) async {
        do {
            let body = try JSONSerialization.data(withJSONObject: ["read": true])
            _ = try await request(path: "/rest/v1/notifications?id=eq.\(id)", method: "PATCH", body: body, prefer: "return=minimal")
            await loadDirectory()
        } catch { errorMessage = error.localizedDescription }
    }

    func signOut() {
        accessToken = nil
        userId = nil
        posts = []
        likedIds = []
        savedIds = []
        Keychain.delete()
    }

    private func request(path: String, method: String = "GET", body: Data? = nil, authenticated: Bool = true, prefer: String? = nil) async throws -> Data {
        var request = URLRequest(url: URL(string: path, relativeTo: Backend.baseURL)!.absoluteURL)
        request.httpMethod = method
        request.setValue(Backend.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if authenticated, let accessToken { request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization") }
        if let prefer { request.setValue(prefer, forHTTPHeaderField: "Prefer") }
        request.httpBody = body
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let bodyText = String(data: data, encoding: .utf8) ?? "Request failed"
            throw NSError(domain: "Skillect", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: bodyText])
        }
        return data
    }
}

private enum Keychain {
    private static let service = "com.skillect.app.session"
    static func save(_ token: String) {
        let data = Data(token.utf8)
        delete()
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        SecItemAdd(query as CFDictionary, nil)
    }
    static func read() -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func delete() {
        SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service] as CFDictionary)
    }
}
