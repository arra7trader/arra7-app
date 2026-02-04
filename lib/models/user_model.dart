/// User model for authentication and profile
class UserModel {
  final String id;
  final String? name;
  final String? email;
  final String? image;
  final String membership;
  final DateTime? membershipExpiry;

  UserModel({
    required this.id,
    this.name,
    this.email,
    this.image,
    this.membership = 'BASIC',
    this.membershipExpiry,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      name: json['name'],
      email: json['email'],
      image: json['image'],
      membership: json['membership'] ?? 'BASIC',
      membershipExpiry: json['membershipExpiry'] != null
          ? DateTime.tryParse(json['membershipExpiry'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'image': image,
      'membership': membership,
      'membershipExpiry': membershipExpiry?.toIso8601String(),
    };
  }

  bool get isPro => membership == 'PRO' || membership == 'VVIP';
  bool get isVvip => membership == 'VVIP';
  
  String get membershipDisplay {
    switch (membership) {
      case 'VVIP':
        return '👑 VVIP';
      case 'PRO':
        return '⭐ PRO';
      default:
        return 'BASIC';
    }
  }
}

/// Quota status for analysis limits
class QuotaStatus {
  final String membership;
  final int dailyLimit;
  final int used;
  final int remaining;
  final bool canAnalyze;
  final List<String> allowedTimeframes;

  QuotaStatus({
    required this.membership,
    required this.dailyLimit,
    required this.used,
    required this.remaining,
    required this.canAnalyze,
    this.allowedTimeframes = const [],
  });

  factory QuotaStatus.fromJson(Map<String, dynamic> json) {
    return QuotaStatus(
      membership: json['membership'] ?? 'BASIC',
      dailyLimit: json['dailyLimit'] is int ? json['dailyLimit'] : -1,
      used: json['used'] ?? 0,
      remaining: json['remaining'] is int ? json['remaining'] : 999,
      canAnalyze: json['canAnalyze'] ?? true,
      allowedTimeframes: json['allowedTimeframes'] != null
          ? List<String>.from(json['allowedTimeframes'])
          : [],
    );
  }

  bool get isUnlimited => dailyLimit == -1;
  
  double get usagePercent {
    if (isUnlimited) return 0;
    if (dailyLimit == 0) return 100;
    return (used / dailyLimit) * 100;
  }
}
