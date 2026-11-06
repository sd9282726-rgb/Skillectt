import Foundation
import Security

private enum Backend {
    static let baseURL = URL(string: "https://chohswyxsckpwyzlbzav.supabase.co")!
    static let publishableKey = "sb_publishable__1Bd6TEnLWDtTdT4U4e-oQ_0MeY2E17"
}

struct AuthResponse: Decodable {
    let access_token: String
}

struct PostProfile: Decodable {
    let display_name: String?
    let username: String?
}

struct FeedPost: Decodable, Identifiable {
    let id: String
    let content: String
    let image_url: String?
    let profiles: PostProfile?
    var imageURL: String? { image_url }
}

@MainActor
final class AppModel: ObservableObject {
    @Published var accessToken: String? = Keychain.read()
    @Published var posts: [FeedPost] = []
    @Published var isBusy = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    func signIn(email: String, password: String) async {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            var request = URLRequest(url: Backend.baseURL.appendingPathComponent("auth/v1/token").appending(queryItems: [URLQueryItem(name: "grant_type", value: "password")]))
            request.httpMethod = "POST"
            request.setValue(Backend.publishableKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
            let (data, response) = try await URLSession.shared.data(for: request)
            try check(response, data)
            let auth = try JSONDecoder().decode(AuthResponse.self, from: data)
            accessToken = auth.access_token
            Keychain.save(auth.access_token)
            await loadFeed()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadFeed() async {
        guard let accessToken else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            var components = URLComponents(url: Backend.baseURL.appendingPathComponent("rest/v1/posts"), resolvingAgainstBaseURL: false)!
            components.queryItems = [
                URLQueryItem(name: "select", value: "id,content,image_url,profiles(display_name,username)"),
                URLQueryItem(name: "order", value: "created_at.desc"),
                URLQueryItem(name: "limit", value: "40")
            ]
            var request = URLRequest(url: components.url!)
            request.setValue(Backend.publishableKey, forHTTPHeaderField: "apikey")
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: request)
            try check(response, data)
            posts = try JSONDecoder().decode([FeedPost].self, from: data)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() {
        accessToken = nil
        posts = []
        Keychain.delete()
    }

    private func check(_ response: URLResponse, _ data: Data) throws {
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "Request failed"
            throw NSError(domain: "Skillect", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: body])
        }
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
