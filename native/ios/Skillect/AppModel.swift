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
    let media_type: String?
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
struct NativeConversation: Identifiable {
    let id: String
    let unreadCount: Int
    init(id: String, unreadCount: Int = 0) { self.id = id; self.unreadCount = unreadCount }
    var title: String { unreadCount > 0 ? "Conversation \(id.prefix(8)) · \(unreadCount) unread" : "Conversation \(id.prefix(8))" }
}
struct NativeChatMessage: Decodable, Identifiable { let id: String; let sender_id: String; let content: String }

struct ModerationReport: Decodable, Identifiable {
 let id:String; let reporter_id:String; let target_type:String; let target_id:String
 let target_user_id:String?; let reason:String; var details:String?; let status:String; let created_at:String
}
struct ModerationMediaCase: Decodable, Identifiable {
    let id:String; let owner_id:String; let status:String; let decision_reason:String?
    let created_at:String; let media_type:String?; let mime_type:String?; let post_content:String?
    var preview_url:String?
}
struct ModerationTextCase: Decodable, Identifiable { let id:String; let user_id:String; let content_type:String; let content_snapshot:String; let reason:String; let status:String; let created_at:String }
struct ModerationAppeal: Decodable, Identifiable {
 let id:String; let user_id:String; let enforcement_user_id:String
 let explanation:String; let status:String; let created_at:String
}

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
    @Published var activeCommentsPostId: String?
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
    @Published var infoMessage: String?
    @Published var isAccountRestricted = false
    private var realtimeTask: Task<Void, Never>?
    private var realtimeSocket: URLSessionWebSocketTask?
    @Published var restrictionStatus = ""
    @Published var restrictionReason = ""
    @Published var myAppealStatus: String?
    @Published var moderationReports: [ModerationReport] = []
    @Published var moderationAppeals: [ModerationAppeal] = []
    @Published var moderationTextCases: [ModerationTextCase] = []
    @Published var moderationMediaCases: [ModerationMediaCase] = []

    private func validateAccountStatus() async -> Bool {
        guard let me = userId, accessToken != nil else { return false }
        do {
            let data = try await request(path: "/rest/v1/account_enforcements?select=status,reason&user_id=eq.\(me)&limit=1")
            let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
            guard let enforcement = rows.first else { isAccountRestricted = false; return true }
            isAccountRestricted = true
            restrictionStatus = enforcement["status"] as? String ?? "suspended"
            restrictionReason = enforcement["reason"] as? String ?? "No reason was provided."
            await loadMyAppeal()
            return false
        } catch {
            isAccountRestricted = true
            restrictionStatus = "verification_error"
            restrictionReason = "We could not verify the account status. Retry before continuing."
            errorMessage = error.localizedDescription
            return false
        }
    }



    func loadMyAppeal() async {
        guard let me = userId else { return }
        do {
            let data = try await request(path: "/rest/v1/moderation_appeals?select=status&user_id=eq.\(me)&order=created_at.desc&limit=1")
            let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] ?? []
            myAppealStatus = rows.first?["status"] as? String
        } catch { myAppealStatus = nil }
    }

    func submitAppeal(_ explanation: String) async {
        guard let me = userId else { return }
        let clean = explanation.trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count >= 20 else { errorMessage = "Please explain your appeal in at least 20 characters."; return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["user_id": me, "enforcement_user_id": me, "explanation": clean])
            _ = try await request(path: "/rest/v1/moderation_appeals", method: "POST", body: body, prefer: "return=minimal")
            myAppealStatus = "pending"
            errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
    }

    var isModerator: Bool {
        guard let token = accessToken else { return false }
        let parts = token.split(separator: ".")
        guard parts.count > 1 else { return false }
        var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload.append("=") }
        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let metadata = json["app_metadata"] as? [String: Any],
              let role = metadata["role"] as? String else { return false }
        return role == "moderator" || role == "admin"
    }

    func loadModerationQueue() async {
        guard isModerator else { errorMessage = "Moderator access is required."; return }
        do {
            let reports = try await request(path: "/rest/v1/reports?select=id,reporter_id,target_type,target_id,target_user_id,reason,details,status,created_at&status=eq.pending&order=created_at.asc&limit=100")
            moderationReports = try JSONDecoder().decode([ModerationReport].self, from: reports)
            for index in moderationReports.indices.prefix(25) {
                let report = moderationReports[index]
                if report.target_type == "message" {
                    let evidenceData = try await request(path: "/rest/v1/moderation_evidence?select=content_snapshot&report_id=eq.\(report.id)&limit=1")
                    let evidenceRows = try JSONSerialization.jsonObject(with: evidenceData) as? [[String: String]] ?? []
                    if let content = evidenceRows.first?["content_snapshot"] { moderationReports[index].details = "Reported message: " + content }
                } else {
                    let table = report.target_type == "post" ? "posts" : (report.target_type == "comment" ? "comments" : "")
                    if !table.isEmpty {
                        let contentData = try await request(path: "/rest/v1/\(table)?select=content&id=eq.\(report.target_id)&limit=1")
                        let contentRows = try JSONSerialization.jsonObject(with: contentData) as? [[String: String]] ?? []
                        if let content = contentRows.first?["content"] { moderationReports[index].details = "Reported content: " + content }
                    }
                }
            }
            let appeals = try await request(path: "/rest/v1/moderation_appeals?select=id,user_id,enforcement_user_id,explanation,status,created_at&status=in.(pending,under_review)&order=created_at.asc&limit=100")
            moderationAppeals = try JSONDecoder().decode([ModerationAppeal].self, from: appeals)
            let textCases = try await request(path: "/rest/v1/moderation_text_cases?select=id,user_id,content_type,content_snapshot,reason,status,created_at&status=eq.blocked&order=created_at.asc&limit=100")
            moderationTextCases = try JSONDecoder().decode([ModerationTextCase].self, from: textCases)
            let mediaCases = try await request(path: "/rest/v1/media_assets?select=id,owner_id,status,decision_reason,created_at,media_type,mime_type,post_content&status=eq.pending&media_type=eq.video&reviewed_at=is.null&order=created_at.asc&limit=100")
            moderationMediaCases = try JSONDecoder().decode([ModerationMediaCase].self, from: mediaCases)
            for index in moderationMediaCases.indices {
                do {
                    let previewBody = try JSONSerialization.data(withJSONObject: ["media_asset_id": moderationMediaCases[index].id])
                    let previewData = try await request(path: "/functions/v1/moderator-media-preview", method: "POST", body: previewBody)
                    let previewObject = try JSONSerialization.jsonObject(with: previewData) as? [String: Any]
                    moderationMediaCases[index].preview_url = previewObject?["signed_url"] as? String
                } catch {
                    moderationMediaCases[index].preview_url = nil
                }
            }
            errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
    }

    func resolveReport(_ report: ModerationReport) async {
        guard isModerator else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["status": "resolved"])
            _ = try await request(path: "/rest/v1/reports?id=eq.\(report.id)", method: "PATCH", body: body, prefer: "return=minimal")
            await loadModerationQueue()
        } catch { errorMessage = error.localizedDescription }
    }


    func hideReportedPost(_ report: ModerationReport) async {
        guard isModerator, report.target_type == "post" else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["moderation_hidden": true])
            _ = try await request(path: "/rest/v1/posts?id=eq.\(report.target_id)", method: "PATCH", body: body, prefer: "return=minimal")
            await resolveReport(report)
        } catch { errorMessage = error.localizedDescription }
    }


    func hideReportedComment(_ report: ModerationReport) async {
        guard isModerator, report.target_type == "comment" else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["moderation_hidden": true])
            _ = try await request(path: "/rest/v1/comments?id=eq.\(report.target_id)", method: "PATCH", body: body, prefer: "return=minimal")
            await resolveReport(report)
        } catch { errorMessage = error.localizedDescription }
    }

    func permanentlyBanReportedUser(_ report: ModerationReport) async {
        guard isModerator, let moderatorId = userId else { return }
        do {
            var targetUserId = report.target_user_id ?? report.target_id
            if report.target_user_id == nil && (report.target_type == "post" || report.target_type == "comment") {
                let table = report.target_type == "post" ? "posts" : "comments"
                let data = try await request(path: "/rest/v1/\(table)?select=author_id&id=eq.\(report.target_id)&limit=1")
                let rows = try JSONSerialization.jsonObject(with: data) as? [[String: String]] ?? []
                guard let author = rows.first?["author_id"] else { throw NSError(domain: "Skillect", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not identify the content author"]) }
                targetUserId = author
            }
            let body = try JSONSerialization.data(withJSONObject: ["user_id": targetUserId, "status": "permanent", "reason": "Moderator action from report: \(report.reason)", "issued_by": moderatorId])
            _ = try await request(path: "/rest/v1/account_enforcements", method: "POST", body: body, prefer: "return=minimal")
            await resolveReport(report)
        } catch { errorMessage = error.localizedDescription }
    }



    func reviewVideoCase(_ item: ModerationMediaCase, approve: Bool) async {
        guard isModerator else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["media_asset_id": item.id, "decision": approve ? "approve" : "reject"])
            _ = try await request(path: "/functions/v1/review-video-post", method: "POST", body: body)
            await loadModerationQueue()
            await loadFeed()
            infoMessage = approve ? "Video approved and published." : "Video rejected."
        } catch { errorMessage = error.localizedDescription }
    }

    func reviewMediaCase(_ item: ModerationMediaCase, ban: Bool) async {
        guard isModerator, let moderatorId = userId else { return }
        do {
            if ban {
                let existing = try await request(path: "/rest/v1/account_enforcements?select=user_id&user_id=eq.\(item.owner_id)&limit=1")
                let rows = try JSONSerialization.jsonObject(with: existing) as? [[String: String]] ?? []
                if rows.isEmpty {
                    let create = try JSONSerialization.data(withJSONObject: ["user_id": item.owner_id, "status": "permanent", "reason": "Moderator-confirmed prohibited media: \(item.decision_reason ?? "safety violation")", "issued_by": moderatorId])
                    _ = try await request(path: "/rest/v1/account_enforcements", method: "POST", body: create, prefer: "return=minimal")
                } else {
                    let update = try JSONSerialization.data(withJSONObject: ["status": "permanent", "reason": "Moderator-confirmed prohibited media: \(item.decision_reason ?? "safety violation")", "issued_by": moderatorId])
                    _ = try await request(path: "/rest/v1/account_enforcements?user_id=eq.\(item.owner_id)", method: "PATCH", body: update, prefer: "return=minimal")
                }
            }
            let body = try JSONSerialization.data(withJSONObject: ["reviewed_at": ISO8601DateFormatter().string(from: Date())])
            _ = try await request(path: "/rest/v1/media_assets?id=eq.\(item.id)", method: "PATCH", body: body, prefer: "return=minimal")
            await loadModerationQueue()
        } catch { errorMessage = error.localizedDescription }
    }

    func reviewTextCase(_ item: ModerationTextCase, ban: Bool) async {
        guard isModerator, let moderatorId = userId else { return }
        do {
            if ban {
                let existing = try await request(path: "/rest/v1/account_enforcements?select=user_id&user_id=eq.\(item.user_id)&limit=1")
                let rows = try JSONSerialization.jsonObject(with: existing) as? [[String: String]] ?? []
                if rows.isEmpty {
                    let create = try JSONSerialization.data(withJSONObject: ["user_id": item.user_id, "status": "permanent", "reason": "Moderator-confirmed text safety violation: \(item.reason)", "issued_by": moderatorId])
                    _ = try await request(path: "/rest/v1/account_enforcements", method: "POST", body: create, prefer: "return=minimal")
                } else {
                    let update = try JSONSerialization.data(withJSONObject: ["status": "permanent", "reason": "Moderator-confirmed text safety violation: \(item.reason)", "issued_by": moderatorId])
                    _ = try await request(path: "/rest/v1/account_enforcements?user_id=eq.\(item.user_id)", method: "PATCH", body: update, prefer: "return=minimal")
                }
            }
            let status = ban ? "escalated" : "reviewed"
            let body = try JSONSerialization.data(withJSONObject: ["status": status, "reviewed_by": moderatorId, "reviewed_at": ISO8601DateFormatter().string(from: Date()), "moderator_note": ban ? "Account permanently banned after moderator review" : "Reviewed; no account ban applied"])
            _ = try await request(path: "/rest/v1/moderation_text_cases?id=eq.\(item.id)", method: "PATCH", body: body, prefer: "return=minimal")
            await loadModerationQueue()
        } catch { errorMessage = error.localizedDescription }
    }

    func reviewAppeal(_ appeal: ModerationAppeal, accept: Bool) async {
        guard isModerator, let moderatorId = userId else { return }
        do {
            let status = accept ? "accepted" : "rejected"
            let body = try JSONSerialization.data(withJSONObject: ["status": status, "reviewed_by": moderatorId, "reviewed_at": ISO8601DateFormatter().string(from: Date()), "moderator_note": accept ? "Appeal accepted by moderator" : "Appeal rejected by moderator"])
            _ = try await request(path: "/rest/v1/moderation_appeals?id=eq.\(appeal.id)", method: "PATCH", body: body, prefer: "return=minimal")
            if accept { _ = try await request(path: "/rest/v1/account_enforcements?user_id=eq.\(appeal.enforcement_user_id)", method: "DELETE", prefer: "return=minimal") }
            await loadModerationQueue()
        } catch { errorMessage = error.localizedDescription }
    }

    func restoreSession() async {
        guard accessToken != nil else { return }
        do {
            let data = try await request(path: "/auth/v1/user")
            let user = try JSONDecoder().decode(AuthUser.self, from: data)
            userId = user.id
            guard await validateAccountStatus() else { return }
            await loadFeed()
            startRealtime()
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
            guard await validateAccountStatus() else { return }
            await loadFeed()
            await loadDirectory()
            startRealtime()
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
                guard await validateAccountStatus() else { return }
                await loadFeed()
                await loadDirectory()
                startRealtime()
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
            let data = try await request(path: "/rest/v1/posts?select=id,author_id,content,image_url,media_type,likes_count,comments_count,profiles(display_name,username)&order=created_at.desc&limit=50")
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

    func submitVideoPost(_ content: String, videoData: Data, mimeType: String, fileName: String) async {
        guard let token = accessToken, let me = userId else { return }
        guard ["video/mp4", "video/webm", "video/quicktime"].contains(mimeType) else { errorMessage = "Choose an MP4, WebM or MOV video"; return }
        guard !videoData.isEmpty, videoData.count <= 50 * 1024 * 1024 else { errorMessage = "Video must be 50 MB or smaller"; return }
        isBusy = true
        errorMessage = nil
        infoMessage = nil
        defer { isBusy = false }
        let ext = mimeType == "video/webm" ? "webm" : (mimeType == "video/quicktime" ? "mov" : "mp4")
        let storagePath = "\(me)/\(UUID().uuidString).\(ext)"
        do {
            _ = try await request(path: "/storage/v1/object/media-quarantine/\(storagePath)", method: "POST", body: videoData, contentType: mimeType)
            let registration = try JSONSerialization.data(withJSONObject: ["storage_path": storagePath, "content": content.trimmingCharacters(in: .whitespacesAndNewlines)])
            _ = try await request(path: "/functions/v1/submit-video-post", method: "POST", body: registration)
            infoMessage = "Video submitted for moderator review. It will appear in the feed after approval."
        } catch { errorMessage = error.localizedDescription }
    }

    func createPost(_ content: String, imageData: Data? = nil, imageMime: String? = nil) async {
        guard let me = userId else { return }
        let cleanText = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanText.isEmpty || imageData != nil else { return }
        guard imageData == nil else {
            errorMessage = "Photo publishing is paused until automated safety screening is connected."
            return
        }
        isBusy = true
        defer { isBusy = false }
        do {
            let post: [String: Any] = ["type": "post", "content": cleanText, "tags": [String]()]
            let body = try JSONSerialization.data(withJSONObject: post)
            _ = try await request(path: "/functions/v1/moderate-text", method: "POST", body: body)
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
            let body = try JSONSerialization.data(withJSONObject: ["type": "comment", "post_id": postId, "content": content.trimmingCharacters(in: .whitespacesAndNewlines)])
            _ = try await request(path: "/functions/v1/moderate-text", method: "POST", body: body)
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
            let communityData = try await request(path: "/rest/v1/communities?select=id,name,description,member_count&created_by=not.is.null&order=created_at.desc&limit=100")
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
            let body = try JSONSerialization.data(withJSONObject: ["type": "profile", "display_name": displayName, "bio": bio])
            _ = try await request(path: "/functions/v1/moderate-text", method: "POST", body: body)
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

    func reportPost(_ postId: String, reason: String = "inappropriate_content") async {
        guard let me = userId else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["reporter_id": me, "target_type": "post", "target_id": postId, "reason": reason])
            _ = try await request(path: "/rest/v1/reports", method: "POST", body: body, prefer: "return=minimal")
        } catch { errorMessage = error.localizedDescription }
    }



    func reportMessage(_ message: NativeChatMessage) async {
        guard let me = userId, message.sender_id != me else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["reporter_id": me, "target_type": "message", "target_id": message.id, "target_user_id": message.sender_id, "reason": "inappropriate_message"])
            _ = try await request(path: "/rest/v1/reports", method: "POST", body: body, prefer: "return=minimal")
            errorMessage = "Message reported for moderator review."
        } catch { errorMessage = error.localizedDescription }
    }

    func reportComment(_ commentId: String, reason: String = "inappropriate_content") async {
        guard let me = userId else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["reporter_id": me, "target_type": "comment", "target_id": commentId, "reason": reason])
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
            let data = try await request(path: "/rest/v1/conversation_participants?select=conversation_id&user_id=eq.\(me)")
            let rows = try JSONSerialization.jsonObject(with: data) as? [[String: String]] ?? []
            let ids = Array(Set(rows.compactMap { $0["conversation_id"] })).sorted()
            var loaded: [NativeConversation] = []
            for conversationId in ids {
                let readData = try await request(path: "/rest/v1/conversation_reads?select=last_read_at&conversation_id=eq.\(conversationId)&user_id=eq.\(me)&limit=1")
                let readRows = try JSONSerialization.jsonObject(with: readData) as? [[String: String]] ?? []
                let lastRead = readRows.first?["last_read_at"]
                var messagesPath = "/rest/v1/messages?select=id&conversation_id=eq.\(conversationId)&sender_id=neq.\(me)&limit=1000"
                if let lastRead { messagesPath += "&created_at=gt." + lastRead.replacingOccurrences(of: "+", with: "%2B") }
                let unreadData = try await request(path: messagesPath)
                let unreadRows = try JSONSerialization.jsonObject(with: unreadData) as? [[String: Any]] ?? []
                loaded.append(NativeConversation(id: conversationId, unreadCount: unreadRows.count))
            }
            conversations = loaded
        } catch { errorMessage = error.localizedDescription }
    }


    func markConversationRead(_ conversationId: String) async {
        guard let me = userId else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["conversation_id": conversationId, "user_id": me, "last_read_at": ISO8601DateFormatter().string(from: Date())])
            _ = try await request(path: "/rest/v1/conversation_reads?on_conflict=conversation_id,user_id", method: "POST", body: body, prefer: "resolution=merge-duplicates,return=minimal")
        } catch { errorMessage = error.localizedDescription }
    }

    func loadChatMessages(_ conversationId: String) async {
        do {
            let data = try await request(path: "/rest/v1/messages?select=id,sender_id,content&conversation_id=eq.\(conversationId)&order=created_at.asc&limit=200")
            chatMessages = try JSONDecoder().decode([NativeChatMessage].self, from: data)
            await markConversationRead(conversationId)
            await loadConversations()
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
            let body = try JSONSerialization.data(withJSONObject: ["type": "message", "conversation_id": conversationId, "content": clean])
            _ = try await request(path: "/functions/v1/moderate-text", method: "POST", body: body)
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
        stopRealtime()
        accessToken = nil
        userId = nil
        isAccountRestricted = false
        myAppealStatus = nil
        posts = []
        likedIds = []
        savedIds = []
        Keychain.delete()
    }

    private func startRealtime() {
        guard let token = accessToken else { return }
        realtimeTask?.cancel()
        realtimeTask = Task { [weak self] in
            guard let self else { return }
            await self.runRealtime(token: token)
        }
    }

    private func stopRealtime() {
        realtimeTask?.cancel()
        realtimeTask = nil
        realtimeSocket?.cancel(with: .goingAway, reason: nil)
        realtimeSocket = nil
    }

    private func runRealtime(token: String) async {
        while !Task.isCancelled {
            guard var components = URLComponents(url: Backend.baseURL, resolvingAgainstBaseURL: false) else { return }
            components.scheme = "wss"
            components.path = "/realtime/v1/websocket"
            components.queryItems = [
                URLQueryItem(name: "apikey", value: Backend.publishableKey),
                URLQueryItem(name: "vsn", value: "1.0.0")
            ]
            guard let url = components.url else { return }
            let socket = URLSession.shared.webSocketTask(with: url)
            realtimeSocket = socket
            socket.resume()
            let changes = ["posts", "comments", "messages", "notifications"].map { ["event": "*", "schema": "public", "table": $0] }
            let config: [String: Any] = [
                "broadcast": ["ack": false, "self": false],
                "presence": ["enabled": false],
                "postgres_changes": changes,
                "private": false
            ]
            let payload: [String: Any] = ["config": config, "access_token": token]
            let join: [String: Any] = ["topic": "realtime:skillect-mvp", "event": "phx_join", "payload": payload, "ref": "1", "join_ref": "1"]
            if let data = try? JSONSerialization.data(withJSONObject: join), let text = String(data: data, encoding: .utf8) {
                try? await socket.send(.string(text))
            }
            let heartbeat = Task {
                var counter = 2
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 25_000_000_000)
                    let message: [String: Any] = ["topic": "phoenix", "event": "heartbeat", "payload": [:], "ref": String(counter)]
                    counter += 1
                    if let data = try? JSONSerialization.data(withJSONObject: message), let text = String(data: data, encoding: .utf8) {
                        try? await socket.send(.string(text))
                    }
                }
            }
            do {
                while !Task.isCancelled {
                    let incoming = try await socket.receive()
                    guard case .string(let raw) = incoming,
                          let data = raw.data(using: .utf8),
                          let message = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                          message["event"] as? String == "postgres_changes" else { continue }
                    await loadFeed()
                    await loadDirectory()
                    await loadConversations()
                    if let conversationId = activeConversationId { await loadChatMessages(conversationId) }
                    if let postId = activeCommentsPostId { await loadComments(postId: postId) }
                }
            } catch {
                // Reconnect after network loss or app backgrounding.
            }
            heartbeat.cancel()
            socket.cancel(with: .goingAway, reason: nil)
            if Task.isCancelled { return }
            try? await Task.sleep(nanoseconds: 3_000_000_000)
        }
    }

    private func request(path: String, method: String = "GET", body: Data? = nil, authenticated: Bool = true, prefer: String? = nil, contentType: String = "application/json") async throws -> Data {
        var request = URLRequest(url: URL(string: path, relativeTo: Backend.baseURL)!.absoluteURL)
        request.httpMethod = method
        request.setValue(Backend.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        if authenticated, let accessToken { request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization") }
        if let prefer { request.setValue(prefer, forHTTPHeaderField: "Prefer") }
        request.httpBody = body
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let bodyText = String(data: data, encoding: .utf8) ?? "Request failed"
            let payload = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let message = payload?["error"] as? String ?? payload?["message"] as? String ?? bodyText
            throw NSError(domain: "Skillect", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: message])
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
