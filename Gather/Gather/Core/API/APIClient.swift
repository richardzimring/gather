import Foundation

// MARK: - API Errors

enum APIError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case networkError(Error)
    case unauthorized
    case forbidden
    case notFound
    case serverError(Int, String?)
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .unauthorized:
            return "Unauthorized - please log in again"
        case .forbidden:
            return "Access forbidden"
        case .notFound:
            return "Resource not found"
        case .serverError(let code, let message):
            return message ?? "Server error (\(code))"
        case .unknown:
            return "An unknown error occurred"
        }
    }
}

// MARK: - API Response

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let message: String?
    let error: String?
}

// MARK: - API Client

actor APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        // TODO: Configure from environment or config
        #if DEBUG
        self.baseURL = "http://localhost:3000"
        #else
        self.baseURL = "https://api.gather.app"
        #endif

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601

        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - Request Building

    private func buildRequest(
        endpoint: String,
        method: String,
        body: Encodable? = nil,
        queryParams: [String: String]? = nil,
        authenticated: Bool = true
    ) async throws -> URLRequest {
        var urlString = "\(baseURL)\(endpoint)"

        if let params = queryParams, !params.isEmpty {
            let queryString = params.map { "\($0.key)=\($0.value)" }.joined(separator: "&")
            urlString += "?\(queryString)"
        }

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated {
            if let token = await AuthManager.shared.accessToken {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
        }

        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        return request
    }

    // MARK: - Request Execution

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }

            switch httpResponse.statusCode {
            case 200...299:
                let apiResponse = try decoder.decode(APIResponse<T>.self, from: data)
                if let responseData = apiResponse.data {
                    return responseData
                }
                throw APIError.noData

            case 401:
                // Try to refresh token
                if await AuthManager.shared.refreshTokens() {
                    // Retry request with new token
                    var newRequest = request
                    if let token = await AuthManager.shared.accessToken {
                        newRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                    }
                    return try await execute(newRequest)
                }
                throw APIError.unauthorized

            case 403:
                throw APIError.forbidden

            case 404:
                throw APIError.notFound

            default:
                let apiResponse = try? decoder.decode(APIResponse<EmptyResponse>.self, from: data)
                throw APIError.serverError(httpResponse.statusCode, apiResponse?.message)
            }
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Public Methods

    func get<T: Decodable>(
        _ endpoint: String,
        queryParams: [String: String]? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        let request = try await buildRequest(
            endpoint: endpoint,
            method: "GET",
            queryParams: queryParams,
            authenticated: authenticated
        )
        return try await execute(request)
    }

    func post<T: Decodable, B: Encodable>(
        _ endpoint: String,
        body: B,
        authenticated: Bool = true
    ) async throws -> T {
        let request = try await buildRequest(
            endpoint: endpoint,
            method: "POST",
            body: body,
            authenticated: authenticated
        )
        return try await execute(request)
    }

    func patch<T: Decodable, B: Encodable>(
        _ endpoint: String,
        body: B,
        authenticated: Bool = true
    ) async throws -> T {
        let request = try await buildRequest(
            endpoint: endpoint,
            method: "PATCH",
            body: body,
            authenticated: authenticated
        )
        return try await execute(request)
    }

    func delete(
        _ endpoint: String,
        authenticated: Bool = true
    ) async throws {
        let request = try await buildRequest(
            endpoint: endpoint,
            method: "DELETE",
            authenticated: authenticated
        )
        let _: EmptyResponse = try await execute(request)
    }
}

// MARK: - Helper Types

struct EmptyResponse: Decodable {}
