import SwiftUI
import UIKit

private let skillectBlue = Color(red: 0.0, green: 0.78, blue: 0.47)
private let skillectBlack = Color(red: 0.02, green: 0.02, blue: 0.035)
private let skillectMuted = Color(red: 0.46, green: 0.44, blue: 0.55)

struct RootView: View {
    @StateObject private var model = AppModel()
    var body: some View {
        Group {
            if model.accessToken == nil { SignInView(model: model) }
            else {
                MainTabs(model: model)
                    .task { await model.restoreSession() }
            }
        }
        .tint(skillectBlue).preferredColorScheme(.dark)
    }
}

struct SignInView: View {
    @ObservedObject var model: AppModel
    @State private var email = ""
    @State private var password = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Spacer()
            Text("Skillect").font(.system(size: 38, weight: .heavy, design: .rounded)).foregroundStyle(skillectBlue)
            Text("Grow skills. Share progress. Build together.").foregroundStyle(.secondary).padding(.bottom, 20)
            TextField("Email", text: $email).textInputAutocapitalization(.never).keyboardType(.emailAddress).autocorrectionDisabled().textFieldStyle(.roundedBorder)
            SecureField("Password", text: $password).textFieldStyle(.roundedBorder)
            if let error = model.errorMessage { Text(error).font(.footnote).foregroundStyle(.red) }
            Button { Task { await model.signIn(email: email, password: password) } } label: {
                HStack {
                    if model.isBusy { ProgressView().tint(.white) }
                    Text(model.isBusy ? "Please wait…" : "Sign in").fontWeight(.semibold)
                }.frame(maxWidth: .infinity).padding(.vertical, 14)
            }.buttonStyle(.borderedProminent).disabled(model.isBusy || email.isEmpty || password.isEmpty)
            Text("Create your account using the existing Skillect sign-up flow, then confirm your email before signing in.")
                .font(.caption).foregroundStyle(.secondary)
            Spacer()
        }.padding(26).background(Color.white.ignoresSafeArea())
    }
}

struct MainTabs: View {
    @ObservedObject var model: AppModel
    init(model: AppModel) {
        self.model = model
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(skillectBlack)
        appearance.stackedLayoutAppearance.normal.iconColor = UIColor(skillectMuted)
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor(skillectMuted)]
        appearance.stackedLayoutAppearance.selected.iconColor = UIColor(skillectBlue)
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: UIColor(skillectBlue)]
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 13) {
                ZStack {
                    RoundedRectangle(cornerRadius: 11).fill(Color(red: 0.06, green: 0.06, blue: 0.09))
                    Text("s").font(.system(size: 34, weight: .bold)).foregroundStyle(skillectBlue)
                }.frame(width: 42, height: 42)
                Text("Skillect").font(.system(size: 25, weight: .heavy)).foregroundStyle(skillectBlue)
                Spacer()
            }
            .padding(.horizontal, 22).frame(height: 72)
            .background(skillectBlack)
            TabView {
                EmptyFeedScreen().tabItem { Label("Feed", systemImage: "house") }
                ExploreView(model: model).tabItem { Label("Explore", systemImage: "safari") }
                CommunitiesView(model: model).tabItem { Label("Communities", systemImage: "person.3") }
                CreateView(model: model).tabItem { Label("Create", systemImage: "plus.square") }
                MessagesPlaceholder().tabItem { Label("Messages", systemImage: "bubble.left") }
                ProfileView(model: model).tabItem { Label("Profile", systemImage: "person") }
            }
            .toolbarBackground(skillectBlack, for: .tabBar)
            .toolbarBackground(.visible, for: .tabBar)
        }
        .background(skillectBlack.ignoresSafeArea())
    }
}

private struct EmptyFeedScreen: View {
    var body: some View { skillectBlack.ignoresSafeArea() }
}

private struct MessagesPlaceholder: View {
    var body: some View { skillectBlack.ignoresSafeArea() }
}

private struct PostCard: View {
    let post: FeedPost
    @ObservedObject var model: AppModel
    @State private var showComments = false
    private var displayName: String {
        if let name = post.profiles?.displayName, !name.isEmpty { return name }
        if let username = post.profiles?.username, !username.isEmpty { return username }
        return "Skillect member"
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(displayName).font(.headline)
                    if let handle = post.profiles?.username { Text("@\(handle)").font(.caption).foregroundStyle(.secondary) }
                }
                Spacer()
                Menu {
                    Button("Save post", systemImage: "bookmark") { Task { await model.toggleSave(post) } }
                    Button("Report post", systemImage: "flag") { Task { await model.reportPost(post.id) } }
                } label: { Image(systemName: "ellipsis").foregroundStyle(.secondary).padding(8) }
            }
            Text(post.content).foregroundStyle(Color.primary).frame(maxWidth: .infinity, alignment: .leading)
            if let imageURL = post.imageURL, let url = URL(string: imageURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFill()
                    case .failure: Text("Image unavailable").font(.caption).foregroundStyle(.secondary)
                    default: ProgressView()
                    }
                }.frame(maxWidth: .infinity).frame(height: 190).clipShape(RoundedRectangle(cornerRadius: 14))
            }
            HStack {
                Button { Task { await model.toggleLike(post) } } label: {
                    Label("\(post.likes_count)", systemImage: model.likedIds.contains(post.id) ? "heart.fill" : "heart")
                        .foregroundStyle(model.likedIds.contains(post.id) ? .pink : .secondary)
                }
                Spacer()
                Button { showComments = true; Task { await model.loadComments(postId: post.id) } } label: {
                    Label("\(post.comments_count)", systemImage: "bubble.right").foregroundStyle(.secondary)
                }
                Spacer()
                Button { Task { await model.toggleSave(post) } } label: {
                    Image(systemName: model.savedIds.contains(post.id) ? "bookmark.fill" : "bookmark")
                        .foregroundStyle(.secondary)
                }
            }.buttonStyle(.plain).font(.subheadline)
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .sheet(isPresented: $showComments) { CommentsView(model: model, postId: post.id) }
    }
}

struct FeedView: View {
    @ObservedObject var model: AppModel
    var body: some View {
        NavigationStack {
            Group {
                if model.isLoading && model.posts.isEmpty { ProgressView("Loading your feed") }
                else if model.posts.isEmpty {
                    ContentUnavailableView("Your feed is ready", systemImage: "sparkles", description: Text("Share your first idea or follow people whose work inspires you."))
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(model.posts) { post in PostCard(post: post, model: model) }
                        }.padding(14)
                    }.refreshable { await model.loadFeed() }
                }
            }
            .background(Color(red: 0.97, green: 0.98, blue: 1))
            .navigationTitle("Skillect")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { model.signOut() } label: { Image(systemName: "rectangle.portrait.and.arrow.right") }
                }
            }
        }
    }
}

struct CreateView: View {
    @ObservedObject var model: AppModel
    @State private var text = ""
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Share what you're learning, making or discovering.")
                    .foregroundStyle(.secondary)
                TextEditor(text: $text)
                    .frame(minHeight: 220)
                    .padding(8)
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.gray.opacity(0.2)))
                Button {
                    Task { await model.createPost(text); if model.errorMessage == nil { text = "" } }
                } label: {
                    HStack { if model.isBusy { ProgressView().tint(.white) }; Text("Publish post").fontWeight(.semibold) }
                        .frame(maxWidth: .infinity).padding(.vertical, 13)
                }
                .buttonStyle(.borderedProminent)
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.isBusy)
                if let error = model.errorMessage { Text(error).font(.caption).foregroundStyle(.red) }
                Spacer()
            }.padding().navigationTitle("Create")
        }
    }
}

struct CommentsView: View {
    @ObservedObject var model: AppModel
    let postId: String
    @State private var draft = ""
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            VStack {
                List(model.comments) { comment in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(comment.profiles?.displayName ?? comment.profiles?.username ?? "Member").font(.headline)
                        Text(comment.content)
                    }
                }
                HStack {
                    TextField("Write a comment", text: $draft).textFieldStyle(.roundedBorder)
                    Button("Send") { Task { await model.addComment(postId: postId, content: draft); draft = "" } }
                        .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }.padding()
            }
            .navigationTitle("Comments")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
            .task { await model.loadComments(postId: postId) }
        }
    }
}

struct ExploreView: View {
    @ObservedObject var model: AppModel
    @State private var query = ""
    @State private var following = Set<String>()
    var filtered: [DirectoryProfile] {
        guard !query.isEmpty else { return model.directory }
        return model.directory.filter { $0.username.localizedCaseInsensitiveContains(query) || $0.display_name.localizedCaseInsensitiveContains(query) || $0.bio.localizedCaseInsensitiveContains(query) }
    }
    var body: some View {
        NavigationStack {
            VStack {
                TextField("Search people and skills", text: $query)
                    .textFieldStyle(.roundedBorder).padding()
                List(filtered) { person in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(person.display_name).font(.headline)
                            Text("@\(person.username)").font(.caption).foregroundStyle(.secondary)
                            if !person.bio.isEmpty { Text(person.bio).font(.subheadline).foregroundStyle(.secondary).lineLimit(2) }
                        }
                        Spacer()
                        if person.id != model.userId {
                            Button(following.contains(person.id) ? "Following" : "Follow") {
                                Task {
                                    await model.toggleFollow(person.id)
                                    if following.contains(person.id) { following.remove(person.id) } else { following.insert(person.id) }
                                }
                            }.buttonStyle(.bordered)
                            Button("Block") { Task { await model.blockUser(person.id) } }.buttonStyle(.bordered)
                        }
                    }
                }.listStyle(.plain)
            }.navigationTitle("Explore").task { await model.loadDirectory() }
        }
    }
}

struct ProjectsView: View {
    @ObservedObject var model: AppModel
    @State private var showCreate = false
    var body: some View {
        NavigationStack {
            List(model.projects) { project in
                VStack(alignment: .leading, spacing: 5) {
                    Text(project.title).font(.headline)
                    Text(project.description).foregroundStyle(.secondary)
                    Text(project.status.replacingOccurrences(of: "_", with: " ").capitalized).font(.caption).foregroundStyle(skillectBlue)
                }.padding(.vertical, 5)
            }
            .navigationTitle("Projects")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { showCreate = true } label: { Image(systemName: "plus") } } }
            .sheet(isPresented: $showCreate) { ProjectCreateView(model: model) }
            .task { await model.loadDirectory() }
        }
    }
}

struct ProjectCreateView: View {
    @ObservedObject var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    var body: some View {
        NavigationStack {
            Form {
                TextField("Project name", text: $title)
                TextField("What are you building?", text: $description, axis: .vertical).lineLimit(4...8)
                Button("Create project") {
                    Task { await model.createProject(title: title, description: description); dismiss() }
                }.disabled(title.isEmpty || description.isEmpty)
            }.navigationTitle("New project")
        }
    }
}

struct CommunitiesView: View {
    @ObservedObject var model: AppModel
    var body: some View {
        NavigationStack {
            List(model.communities) { community in
                VStack(alignment: .leading, spacing: 6) {
                    Text(community.name).font(.headline)
                    Text(community.description).foregroundStyle(.secondary)
                    HStack {
                        Text("\(community.member_count) members").font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        Button("Join") { Task { await model.joinCommunity(community.id) } }.buttonStyle(.bordered)
                    }
                }.padding(.vertical, 5)
            }.navigationTitle("Communities").task { await model.loadDirectory() }
        }
    }
}

struct NotificationsView: View {
    @ObservedObject var model: AppModel
    var body: some View {
        NavigationStack {
            List(model.notifications) { notification in
                Button { Task { await model.markNotificationRead(notification.id) } } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(notification.message ?? notification.type.capitalized).foregroundStyle(.primary)
                            Text(notification.type).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if !notification.read { Circle().fill(skillectBlue).frame(width: 8, height: 8) }
                    }
                }
            }.navigationTitle("Notifications").task { await model.loadDirectory() }
        }
    }
}

struct ProfileView: View {
    @ObservedObject var model: AppModel
    @State private var displayName = ""
    @State private var bio = ""
    var body: some View {
        NavigationStack {
            Form {
                Section("Your profile") {
                    TextField("Display name", text: $displayName)
                    TextField("Bio", text: $bio, axis: .vertical).lineLimit(3...6)
                    Text("@\(model.currentProfile?.username ?? "")").foregroundStyle(.secondary)
                    Button("Save profile") { Task { await model.updateProfile(displayName: displayName, bio: bio) } }
                }
                Section("Your activity") {
                    LabeledContent("Posts", value: "\(model.posts.filter { $0.authorId == model.userId }.count)")
                    LabeledContent("Projects", value: "\(model.projects.filter { $0.id.isEmpty == false }.count)")
                }
                Section {
                    Button("Sign out", role: .destructive) { model.signOut() }
                }
            }
            .navigationTitle("Profile")
            .task {
                await model.loadDirectory()
                displayName = model.currentProfile?.display_name ?? ""
                bio = model.currentProfile?.bio ?? ""
            }
        }
    }
}
