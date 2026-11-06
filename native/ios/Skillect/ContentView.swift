import SwiftUI

private let skillectBlue = Color(red: 49/255, green: 92/255, blue: 245/255)

struct RootView: View {
    @StateObject private var model = AppModel()

    var body: some View {
        Group {
            if model.accessToken == nil {
                SignInView(model: model)
            } else {
                FeedView(model: model)
            }
        }
        .tint(skillectBlue)
    }
}

struct SignInView: View {
    @ObservedObject var model: AppModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Spacer()
            Text("Skillect")
                .font(.system(size: 38, weight: .heavy, design: .rounded))
                .foregroundStyle(skillectBlue)
            Text("Grow skills. Share progress. Build together.")
                .foregroundStyle(.secondary)
                .padding(.bottom, 20)
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)
            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)
            if let error = model.errorMessage {
                Text(error).font(.footnote).foregroundStyle(.red)
            }
            Button {
                Task { await model.signIn(email: email, password: password) }
            } label: {
                HStack {
                    if model.isBusy { ProgressView().tint(.white) }
                    Text(model.isBusy ? "Please wait…" : "Sign in").fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .disabled(model.isBusy || email.isEmpty || password.isEmpty)
            Text("Create your account using the existing Skillect sign-up flow, then confirm your email before signing in.")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(26)
        .background(Color.white.ignoresSafeArea())
    }
}

struct FeedView: View {
    @ObservedObject var model: AppModel

    var body: some View {
        NavigationStack {
            Group {
                if model.isLoading && model.posts.isEmpty {
                    ProgressView("Loading your feed")
                } else if model.posts.isEmpty {
                    ContentUnavailableView("Your feed is ready", systemImage: "sparkles", description: Text("Share your first idea or follow people whose work inspires you."))
                } else {
                    List(model.posts) { post in
                        VStack(alignment: .leading, spacing: 9) {
                            Text(post.profiles?.displayName ?? post.profiles?.username ?? "Skillect member")
                                .font(.headline)
                            if let handle = post.profiles?.username {
                                Text("@\(handle)").font(.caption).foregroundStyle(.secondary)
                            }
                            Text(post.content).foregroundStyle(Color.primary)
                            if let image = post.imageURL, !image.isEmpty {
                                AsyncImage(url: URL(string: image)) { phase in
                                    if let image = phase.image {
                                        image.resizable().scaledToFill()
                                    } else if phase.error != nil {
                                        EmptyView()
                                    } else {
                                        ProgressView()
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 190)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                        }
                        .padding(.vertical, 8)
                    }
                    .listStyle(.plain)
                    .refreshable { await model.loadFeed() }
                }
            }
            .navigationTitle("Skillect")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sign out") { model.signOut() }
                }
            }
        }
        .task { await model.loadFeed() }
    }
}
